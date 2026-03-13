/******************************************************************************
 * main.cpp — Edenia Villa Security Guard Attendance System
 *
 * ESP32 + R307 Fingerprint Sensor + 16x2 I2C LCD + HTTP API
 *
 * Features:
 *   • Fingerprint-based check-in / check-out via server API
 *   • Automatic shift replacement handled server-side
 *   • Real-time LCD feedback for every system state
 *   • HTTP POST to Next.js API on each fingerprint scan
 *   • Server handles all attendance logic (check-in, check-out, replacement)
 *
 * Hardware Wiring:
 *   R307 Sensor:  TX → GPIO16 (RX2), RX → GPIO17 (TX2), VCC → 3.3V, GND
 *   I2C LCD:      SDA → GPIO21, SCL → GPIO22, VCC → 5V, GND
 *
 * (c) 2026 Edenia Villa Management System
 ******************************************************************************/

#include "config.h"
#include <Adafruit_Fingerprint.h>
#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <NTPClient.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Wire.h>

// ═══════════════════════════════════════════════════════════════════════════════
// Global Objects
// ═══════════════════════════════════════════════════════════════════════════════

// LCD Display
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);

// Fingerprint sensor on Hardware Serial 2
HardwareSerial fingerSerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

// NTP Time Client
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, NTP_SERVER, UTC_OFFSET_SECONDS, 60000);

// Timing trackers
unsigned long lastScanTime = 0;
unsigned long lastLcdMessage = 0;
unsigned long lastClockUpdate = 0;
unsigned long bootTime = 0;
bool showingMessage = false;

#define CLOCK_UPDATE_INTERVAL_MS 1000  // Update clock display every second

// ═══════════════════════════════════════════════════════════════════════════════
// LCD Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

void lcdPrint(const char *line1, const char *line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

void lcdShowTemp(const char *line1, const char *line2) {
  lcdPrint(line1, line2);
  lastLcdMessage = millis();
  showingMessage = true;
}

void lcdShowClock() {
  timeClient.update();
  int hours = timeClient.getHours();
  int minutes = timeClient.getMinutes();
  int seconds = timeClient.getSeconds();

  // Get epoch time for date calculation
  unsigned long epochTime = timeClient.getEpochTime();
  struct tm *ptm = gmtime((time_t *)&epochTime);
  int day = ptm->tm_mday;
  int month = ptm->tm_mon + 1;
  int year = ptm->tm_year + 1900;

  // Line 1: "Edenia Security" (branding)
  // Line 2: "HH:MM:SS  DD/MM" (time + date)
  char line2[17];
  snprintf(line2, sizeof(line2), "%02d:%02d:%02d  %02d/%02d",
           hours, minutes, seconds, day, month);

  lcd.setCursor(0, 0);
  lcd.print("Edenia Security ");
  lcd.setCursor(0, 1);
  lcd.print(line2);

  lastClockUpdate = millis();
}

void lcdShowIdle() {
  lcdShowClock();
  showingMessage = false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WiFi Connection
// ═══════════════════════════════════════════════════════════════════════════════

void connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);
  lcdPrint("Connecting WiFi", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");

    if (millis() - startAttempt > WIFI_CONNECT_TIMEOUT_MS) {
      Serial.println("\n[WiFi] Connection timeout!");
      lcdPrint("WiFi FAILED!", "Check settings");
      delay(3000);
      ESP.restart();
    }
  }

  Serial.println();
  Serial.print("[WiFi] Connected! IP: ");
  Serial.println(WiFi.localIP());

  char ipStr[17];
  snprintf(ipStr, sizeof(ipStr), "IP:%s", WiFi.localIP().toString().c_str());
  lcdPrint("WiFi Connected!", ipStr);
  delay(2000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Guard Lookup (for LCD display — name lookup from local config)
// ═══════════════════════════════════════════════════════════════════════════════

int findGuardByFingerprint(uint8_t fpID) {
  for (int i = 0; i < NUM_GUARDS; i++) {
    if (GUARDS[i].fingerprintID == fpID) {
      return i;
    }
  }
  return -1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP API Communication
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send a fingerprint scan to the server API.
 * The server handles all logic: check-in, check-out, auto-replacement.
 * Returns the server response for LCD display.
 */
void sendScanToServer(int fingerprintId, int guardIdx) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi not connected, reconnecting...");
    connectWiFi();
  }

  HTTPClient http;
  String url = String(API_BASE_URL) + String(API_SCAN_PATH);

  Serial.printf("[HTTP] POST %s\n", url.c_str());

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10 second timeout

  // Build JSON payload
  StaticJsonDocument<128> requestDoc;
  requestDoc["fingerprintId"] = fingerprintId;
  String requestBody;
  serializeJson(requestDoc, requestBody);

  Serial.printf("[HTTP] Body: %s\n", requestBody.c_str());

  int httpCode = http.POST(requestBody);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Response (%d): %s\n", httpCode, response.c_str());

    // Parse JSON response
    StaticJsonDocument<512> responseDoc;
    DeserializationError err = deserializeJson(responseDoc, response);

    if (err) {
      Serial.printf("[HTTP] JSON parse error: %s\n", err.c_str());
      lcdShowTemp("Server Error", "Bad response");
      http.end();
      return;
    }

    if (httpCode == 200) {
      const char *action = responseDoc["action"];
      const char *message = responseDoc["message"];
      const char *guardName = responseDoc["guard"]["name"];

      char lcdLine1[17];
      char lcdLine2[17];

      if (strcmp(action, "checkin") == 0) {
        snprintf(lcdLine1, sizeof(lcdLine1), "%s", guardName);
        const char *status = responseDoc["status"];
        if (strcmp(status, "late") == 0) {
          snprintf(lcdLine2, sizeof(lcdLine2), "Checked In LATE");
        } else {
          snprintf(lcdLine2, sizeof(lcdLine2), "Checked In OK!");
        }
      } else if (strcmp(action, "checkout") == 0) {
        snprintf(lcdLine1, sizeof(lcdLine1), "%s", guardName);
        float hours = responseDoc["hoursWorked"];
        snprintf(lcdLine2, sizeof(lcdLine2), "Out %.1fh Bye!", hours);
      } else if (strcmp(action, "replacement") == 0) {
        snprintf(lcdLine1, sizeof(lcdLine1), "%s", guardName);
        snprintf(lcdLine2, sizeof(lcdLine2), "Replacing shift");
      } else {
        snprintf(lcdLine1, sizeof(lcdLine1), "%s", guardName);
        snprintf(lcdLine2, sizeof(lcdLine2), "Processed");
      }

      lcdShowTemp(lcdLine1, lcdLine2);
    } else if (httpCode == 404) {
      lcdShowTemp("Unknown Print", "Not registered");
    } else {
      char errLine[17];
      snprintf(errLine, sizeof(errLine), "Error: %d", httpCode);
      lcdShowTemp("Server Error", errLine);
    }
  } else {
    Serial.printf("[HTTP] Request failed: %s\n",
                  http.errorToString(httpCode).c_str());
    lcdShowTemp("Network Error", "Check server");
  }

  http.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fingerprint Scanning
// ═══════════════════════════════════════════════════════════════════════════════

int scanFingerprint() {
  uint8_t p = finger.getImage();

  if (p == FINGERPRINT_NOFINGER) {
    return -1; // No finger on sensor
  }

  if (p != FINGERPRINT_OK) {
    Serial.println("[Finger] Image capture failed");
    return -2; // Sensor error
  }

  lcdPrint("Scanning...", "Hold still");
  Serial.println("[Finger] Image captured, converting...");

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    Serial.println("[Finger] Image conversion failed");
    return -2;
  }

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    Serial.printf("[Finger] Match found! ID: %d, Confidence: %d\n",
                  finger.fingerID, finger.confidence);
    return finger.fingerID;
  } else if (p == FINGERPRINT_NOTFOUND) {
    Serial.println("[Finger] No match found");
    return -3; // Not recognized
  } else {
    Serial.println("[Finger] Search error");
    return -2;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════════════════════

void setup() {
  bootTime = millis();

  // Initialize Serial
  Serial.begin(115200);
  delay(100);
  Serial.println();
  Serial.println("╔══════════════════════════════════════════╗");
  Serial.println("║ Edenia Villa Security Attendance System  ║");
  Serial.println("║         HTTP API Mode v2.0.0             ║");
  Serial.println("╚══════════════════════════════════════════╝");

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcdPrint("Edenia Security", "Starting...");
  delay(1500);

  // Initialize fingerprint sensor
  Serial.println("[Init] Starting fingerprint sensor...");
  fingerSerial.begin(57600, SERIAL_8N1, FINGER_RX_PIN, FINGER_TX_PIN);
  finger.begin(57600);

  if (finger.verifyPassword()) {
    Serial.println("[Init] Fingerprint sensor found!");
    lcdPrint("Sensor OK", "R307 Ready");
  } else {
    Serial.println("[Init] ERROR: Fingerprint sensor not found!");
    lcdPrint("Sensor ERROR!", "Check wiring");
    while (1) {
      delay(1000);
    }
  }
  delay(1000);

  finger.getParameters();
  Serial.printf("[Init] Sensor capacity: %d, Security level: %d\n",
                finger.capacity, finger.security_level);

  // Connect WiFi
  connectWiFi();

  // Start NTP
  Serial.println("[Init] Syncing time via NTP...");
  lcdPrint("Syncing Clock", "Please wait...");
  timeClient.begin();

  int ntpRetries = 10;
  while (!timeClient.update() && ntpRetries > 0) {
    timeClient.forceUpdate();
    delay(500);
    ntpRetries--;
  }

  char timeStr[6];
  snprintf(timeStr, sizeof(timeStr), "%02d:%02d", timeClient.getHours(),
           timeClient.getMinutes());
  char timeLine[17];
  snprintf(timeLine, sizeof(timeLine), "Time: %s", timeStr);
  lcdPrint("Clock Synced!", timeLine);
  Serial.printf("[Init] Time synced: %s\n", timeStr);
  delay(1500);

  // Show idle screen
  lcdShowIdle();

  Serial.println("[Init] System ready! Waiting for fingerprint scans...");
  Serial.printf("[Init] API endpoint: %s%s\n", API_BASE_URL, API_SCAN_PATH);
  Serial.println("────────────────────────────────────────────");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Loop
// ═══════════════════════════════════════════════════════════════════════════════

void loop() {
  // ── Keep time updated
  timeClient.update();

  // ── Clear temporary LCD messages
  if (showingMessage &&
      (millis() - lastLcdMessage >= LCD_MESSAGE_DURATION_MS)) {
    lcdShowIdle();
  }

  // ── Update clock display every second when idle
  if (!showingMessage &&
      (millis() - lastClockUpdate >= CLOCK_UPDATE_INTERVAL_MS)) {
    lcdShowClock();
  }

  // ── Scan cooldown
  if (millis() - lastScanTime < SCAN_COOLDOWN_MS) {
    return;
  }

  // ── Fingerprint scanning
  int result = scanFingerprint();

  if (result == -1) {
    return; // No finger present
  }

  lastScanTime = millis();

  if (result == -2) {
    lcdShowTemp("Scan Error", "Try Again");
    Serial.println("[Scan] Sensor error during scan");
    return;
  }

  if (result == -3) {
    lcdShowTemp("Not Recognized", "Try Again");
    Serial.println("[Scan] Fingerprint not in database");
    return;
  }

  // ── Fingerprint matched — find guard for LCD name display
  int guardIdx = findGuardByFingerprint((uint8_t)result);

  if (guardIdx < 0) {
    char line2[17];
    snprintf(line2, sizeof(line2), "FP ID:%d Unknown", result);
    lcdShowTemp("Unknown ID", line2);
    Serial.printf("[Scan] FP ID %d not mapped to any guard\n", result);
    return;
  }

  // ── Send to server API — server handles check-in/out/replacement
  Serial.printf("[Scan] Identified: %s (FP ID: %d)\n", GUARDS[guardIdx].name,
                result);
  lcdPrint(GUARDS[guardIdx].name, "Processing...");
  sendScanToServer(result, guardIdx);
}
