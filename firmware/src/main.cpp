/******************************************************************************
 * main.cpp — Edenia Villa Security Guard Attendance System (v2.0)
 *
 * ESP32 + R307 Fingerprint Sensor + 16x2 I2C LCD + WiFi HTTP
 *
 * How it works:
 *   1. Guard places finger on R307 sensor
 *   2. ESP32 identifies the fingerprint
 *   3. ESP32 sends HTTP POST to Next.js API with the fingerprint ID
 *   4. Server handles all logic (check-in/out, late detection, replacement)
 *   5. ESP32 displays the server's response on the LCD
 *
 * All attendance logic lives on the server — the ESP32 is a thin client
 * that handles scanning + display only.
 *
 * Hardware Wiring:
 *   R307 Sensor:  Pin3(TXD) → GPIO16, Pin4(RXD) → GPIO17, Pin1(VCC) → 3.3V
 *   I2C LCD:      SDA → GPIO21, SCL → GPIO22, VCC → 5V, GND → GND
 *
 * (c) 2026 Edenia Villa Management System
 ******************************************************************************/

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_Fingerprint.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <ArduinoJson.h>
#include "config.h"

// ═══════════════════════════════════════════════════════════════════════════════
// Global Objects
// ═══════════════════════════════════════════════════════════════════════════════

// HTTPS client (skip certificate verification for simplicity)
WiFiClientSecure secureClient;
// ═══════════════════════════════════════════════════════════════════════════════

// LCD Display
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);

// Fingerprint sensor on Hardware Serial 2
HardwareSerial fingerSerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

// NTP Time Client
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, NTP_SERVER, UTC_OFFSET_SECONDS, 60000);

// ═══════════════════════════════════════════════════════════════════════════════
// Timing Trackers
// ═══════════════════════════════════════════════════════════════════════════════
unsigned long lastHeartbeat    = 0;
unsigned long lastLcdMessage   = 0;
unsigned long lastScanTime     = 0;
unsigned long lastEnrollCheck  = 0;
unsigned long bootTime         = 0;
bool          showingMessage   = false;
bool          enrollingMode    = false;

#define ENROLL_CHECK_INTERVAL_MS 5000  // Poll for enrollment requests every 5s

// ═══════════════════════════════════════════════════════════════════════════════
// LCD Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

void lcdPrint(const char* line1, const char* line2) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(line1);
    lcd.setCursor(0, 1);
    lcd.print(line2);
}

void lcdShowTemp(const char* line1, const char* line2) {
    lcdPrint(line1, line2);
    lastLcdMessage = millis();
    showingMessage = true;
}

void lcdShowIdle() {
    char timeStr[6];
    snprintf(timeStr, sizeof(timeStr), "%02d:%02d", timeClient.getHours(), timeClient.getMinutes());
    char line2[17];
    snprintf(line2, sizeof(line2), " %s", timeStr);
    lcdPrint("Edenia Security", line2);
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
            lcdPrint("WiFi FAILED!", "Restarting...");
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
// Guard Lookup (for LCD display names)
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
// HTTP: Send Fingerprint Scan to Server
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/attendance/scan with { fingerprintId: N }
 * 
 * Server returns JSON like:
 * {
 *   "action": "checkin" | "checkout" | "replacement",
 *   "guard": { "name": "...", "role": "..." },
 *   "message": "...",
 *   "status": "present" | "late",
 *   "previousGuard": { "name": "...", ... } | null,
 *   "hoursWorked": 12.5,
 *   "checkIn": "...",
 *   "checkOut": "..."
 * }
 */
void sendScanToServer(uint8_t fingerprintId, int guardIdx) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[HTTP] WiFi not connected, reconnecting...");
        lcdShowTemp("WiFi Lost!", "Reconnecting...");
        connectWiFi();
    }

    HTTPClient http;
    String url = String(SERVER_URL) + API_SCAN_PATH;

    Serial.printf("[HTTP] POST %s (fingerprintId: %d)\n", url.c_str(), fingerprintId);
    lcdPrint(GUARDS[guardIdx].name, "Sending...");

    http.begin(secureClient, url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(HTTP_TIMEOUT_MS);

    // Build JSON body
    String body = "{\"fingerprintId\":" + String(fingerprintId) + "}";

    int httpCode = http.POST(body);

    if (httpCode > 0) {
        String response = http.getString();
        Serial.printf("[HTTP] Response %d: %s\n", httpCode, response.c_str());

        // Parse the JSON response
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, response);

        if (error) {
            Serial.printf("[HTTP] JSON parse error: %s\n", error.c_str());
            lcdShowTemp("Server Error", "Bad response");
            http.end();
            return;
        }

        if (httpCode == 200) {
            const char* action = doc["action"] | "unknown";
            const char* guardName = doc["guard"]["name"] | GUARDS[guardIdx].name;
            const char* message = doc["message"] | "";

            char lcdLine2[17];

            if (strcmp(action, "checkin") == 0) {
                const char* status = doc["status"] | "present";
                char timeStr[6];
                snprintf(timeStr, sizeof(timeStr), "%02d:%02d",
                         timeClient.getHours(), timeClient.getMinutes());

                if (strcmp(status, "late") == 0) {
                    snprintf(lcdLine2, sizeof(lcdLine2), "In:%s  LATE", timeStr);
                } else {
                    snprintf(lcdLine2, sizeof(lcdLine2), "In:%s  OK!", timeStr);
                }
                lcdShowTemp(guardName, lcdLine2);
            }
            else if (strcmp(action, "checkout") == 0) {
                float hours = doc["hoursWorked"] | 0.0f;
                snprintf(lcdLine2, sizeof(lcdLine2), "Out! %.1fh work", hours);
                lcdShowTemp(guardName, lcdLine2);
            }
            else if (strcmp(action, "replacement") == 0) {
                // New guard replacing previous
                const char* prevName = doc["previousGuard"]["name"] | "Previous";
                char line1[17];
                snprintf(line1, sizeof(line1), "%s->", prevName);
                snprintf(lcdLine2, sizeof(lcdLine2), "%s In!", guardName);
                lcdShowTemp(line1, lcdLine2);

                // Show replacement for a bit longer, then show new guard
                delay(LCD_MESSAGE_DURATION_MS);
                const char* status = doc["status"] | "present";
                char timeStr[6];
                snprintf(timeStr, sizeof(timeStr), "%02d:%02d",
                         timeClient.getHours(), timeClient.getMinutes());
                if (strcmp(status, "late") == 0) {
                    snprintf(lcdLine2, sizeof(lcdLine2), "In:%s  LATE", timeStr);
                } else {
                    snprintf(lcdLine2, sizeof(lcdLine2), "In:%s  OK!", timeStr);
                }
                lcdShowTemp(guardName, lcdLine2);
            }
            else {
                lcdShowTemp(guardName, "Done!");
            }
        }
        else if (httpCode == 404) {
            lcdShowTemp("Not Registered", "Contact Admin");
            Serial.println("[HTTP] Fingerprint not registered on server");
        }
        else {
            const char* errMsg = doc["error"] | "Server Error";
            char lcdLine2[17];
            snprintf(lcdLine2, sizeof(lcdLine2), "Err:%d", httpCode);
            lcdShowTemp(errMsg, lcdLine2);
        }
    } else {
        Serial.printf("[HTTP] POST failed: %s\n", http.errorToString(httpCode).c_str());
        lcdShowTemp("Server Offline", "Try Again");
    }

    http.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP: Send Heartbeat
// ═══════════════════════════════════════════════════════════════════════════════

void sendHeartbeat() {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    String url = String(SERVER_URL) + API_HEARTBEAT;

    http.begin(secureClient, url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(5000);

    unsigned long uptimeSeconds = (millis() - bootTime) / 1000;
    int rssi = WiFi.RSSI();

    String body = "{\"status\":\"online\",\"uptime\":" + String(uptimeSeconds) +
                  ",\"rssi\":" + String(rssi) +
                  ",\"fw\":\"" + FW_VERSION + "\"}";

    int httpCode = http.POST(body);

    if (httpCode > 0) {
        Serial.printf("[Heartbeat] Sent OK (%d) — uptime: %lus, rssi: %d\n",
                      httpCode, uptimeSeconds, rssi);
    } else {
        Serial.printf("[Heartbeat] Failed: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fingerprint Enrollment (remote-triggered)
// ═══════════════════════════════════════════════════════════════════════════════

// Forward declaration
void reportEnrollResult(int fpId, bool success, const char* message);

/**
 * Check if the server has a pending enrollment request.
 * If so, run the enrollment process.
 */
void checkForEnrollment() {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    String url = String(SERVER_URL) + "/api/attendance/enroll";
    http.begin(secureClient, url);
    http.setTimeout(5000);

    int httpCode = http.GET();
    if (httpCode != 200) {
        http.end();
        return;
    }

    String response = http.getString();
    http.end();

    JsonDocument doc;
    if (deserializeJson(doc, response)) return;

    const char* status = doc["status"] | "idle";
    if (strcmp(status, "pending") != 0) return;

    // We have a pending enrollment!
    int fpId = doc["fingerprintId"] | 0;
    const char* guardName = doc["guardName"] | "New Guard";

    if (fpId < 1 || fpId > 127) {
        Serial.printf("[Enroll] Invalid FP ID: %d\n", fpId);
        return;
    }

    Serial.printf("[Enroll] Starting enrollment: %s → slot %d\n", guardName, fpId);
    enrollingMode = true;

    // ── Step 1: First finger capture ─────────────────────────
    char line1[17];
    snprintf(line1, sizeof(line1), "Enroll: %s", guardName);
    lcdPrint(line1, "Place finger...");
    Serial.println("[Enroll] Waiting for first finger placement...");

    // Wait for finger (timeout 30 seconds)
    unsigned long enrollStart = millis();
    uint8_t p = FINGERPRINT_NOFINGER;
    while (p != FINGERPRINT_OK) {
        p = finger.getImage();
        if (millis() - enrollStart > 30000) {
            lcdShowTemp("Enroll Timeout", "Try again");
            reportEnrollResult(fpId, false, "Timeout waiting for finger");
            enrollingMode = false;
            return;
        }
        delay(100);
    }

    // Convert first image
    p = finger.image2Tz(1);
    if (p != FINGERPRINT_OK) {
        lcdShowTemp("Capture Error", "Try again");
        reportEnrollResult(fpId, false, "First capture failed");
        enrollingMode = false;
        return;
    }

    Serial.println("[Enroll] First capture OK");
    lcdPrint("Good!", "Remove finger...");
    delay(2000);

    // Wait for finger removal
    while (finger.getImage() != FINGERPRINT_NOFINGER) {
        delay(100);
    }

    // ── Step 2: Second finger capture ────────────────────────
    lcdPrint(line1, "Place again...");
    Serial.println("[Enroll] Waiting for second finger placement...");

    enrollStart = millis();
    p = FINGERPRINT_NOFINGER;
    while (p != FINGERPRINT_OK) {
        p = finger.getImage();
        if (millis() - enrollStart > 30000) {
            lcdShowTemp("Enroll Timeout", "Try again");
            reportEnrollResult(fpId, false, "Timeout on second capture");
            enrollingMode = false;
            return;
        }
        delay(100);
    }

    // Convert second image
    p = finger.image2Tz(2);
    if (p != FINGERPRINT_OK) {
        lcdShowTemp("Capture Error", "Try again");
        reportEnrollResult(fpId, false, "Second capture failed");
        enrollingMode = false;
        return;
    }

    Serial.println("[Enroll] Second capture OK, creating model...");

    // ── Create model from the two captures ───────────────────
    p = finger.createModel();
    if (p != FINGERPRINT_OK) {
        lcdShowTemp("Prints Differ!", "Try again");
        reportEnrollResult(fpId, false, "Fingerprints did not match");
        enrollingMode = false;
        return;
    }

    // ── Store the model in the sensor ────────────────────────
    p = finger.storeModel(fpId);
    if (p != FINGERPRINT_OK) {
        lcdShowTemp("Store Failed!", "Try again");
        reportEnrollResult(fpId, false, "Failed to store template");
        enrollingMode = false;
        return;
    }

    // ── Success! ─────────────────────────────────────────────
    Serial.printf("[Enroll] SUCCESS! %s stored at slot %d\n", guardName, fpId);
    char successLine[17];
    snprintf(successLine, sizeof(successLine), "Slot %d saved!", fpId);
    lcdShowTemp(guardName, successLine);
    delay(2000);
    lcdShowTemp("Enrolled OK!", guardName);

    reportEnrollResult(fpId, true, "Enrollment successful");
    enrollingMode = false;
}

/**
 * Report enrollment result back to the server via PATCH.
 */
void reportEnrollResult(int fpId, bool success, const char* message) {
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/attendance/enroll";
    http.begin(secureClient, url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(5000);

    String body = "{\"fingerprintId\":" + String(fpId) +
                  ",\"success\":" + (success ? "true" : "false") +
                  ",\"message\":\"" + String(message) + "\"}";

    int code = http.sendRequest("PATCH", body);
    Serial.printf("[Enroll] Report result: %d (success=%d)\n", code, success);
    http.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fingerprint Scanning
// ═══════════════════════════════════════════════════════════════════════════════

int scanFingerprint() {
    uint8_t p = finger.getImage();

    if (p == FINGERPRINT_NOFINGER) return -1;
    if (p != FINGERPRINT_OK) {
        Serial.println("[Finger] Image capture failed");
        return -2;
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
        Serial.printf("[Finger] Match! ID: %d, Confidence: %d\n",
                      finger.fingerID, finger.confidence);
        return finger.fingerID;
    } else if (p == FINGERPRINT_NOTFOUND) {
        Serial.println("[Finger] No match");
        return -3;
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

    Serial.begin(115200);
    delay(100);
    Serial.println();
    Serial.println("╔═══════════════════════════════════════════╗");
    Serial.println("║  Edenia Villa Attendance System v2.0       ║");
    Serial.println("║  ESP32 + R307 + LCD + WiFi HTTP            ║");
    Serial.println("╚═══════════════════════════════════════════╝");

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
        while (1) { delay(1000); }
    }
    delay(1000);

    finger.getParameters();
    Serial.printf("[Init] Sensor capacity: %d, Security level: %d\n",
                  finger.capacity, finger.security_level);

    // ── Clear all stored fingerprints (ONE-TIME RESET) ──────────
    // Remove this block after flashing once!
    Serial.println("[Init] ⚠ Clearing ALL fingerprints from sensor...");
    finger.emptyDatabase();
    Serial.println("[Init] ✓ Sensor cleared! All fingerprint slots are now empty.");
    // ─────────────────────────────────────────────────────────────

    // Connect WiFi
    connectWiFi();

    // Configure HTTPS (skip certificate verification)
    secureClient.setInsecure();

    // Start NTP
    Serial.println("[Init] Syncing time...");
    lcdPrint("Syncing Clock", "Please wait...");
    timeClient.begin();

    int ntpRetries = 10;
    while (!timeClient.update() && ntpRetries > 0) {
        timeClient.forceUpdate();
        delay(500);
        ntpRetries--;
    }

    char timeStr[6];
    snprintf(timeStr, sizeof(timeStr), "%02d:%02d",
             timeClient.getHours(), timeClient.getMinutes());
    char timeLine[17];
    snprintf(timeLine, sizeof(timeLine), "Time: %s", timeStr);
    lcdPrint("Clock Synced!", timeLine);
    Serial.printf("[Init] Time synced: %s\n", timeStr);
    delay(1500);

    // Send initial heartbeat
    sendHeartbeat();
    lastHeartbeat = millis();

    // Show idle screen
    lcdShowIdle();

    Serial.println("[Init] System ready! Waiting for fingerprint scans...");
    Serial.printf("[Init] Server: %s\n", SERVER_URL);
    Serial.println("────────────────────────────────────────────");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Loop
// ═══════════════════════════════════════════════════════════════════════════════

void loop() {
    // Keep time updated
    timeClient.update();

    // Periodic heartbeat
    if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        sendHeartbeat();
        lastHeartbeat = millis();
    }

    // Check for pending enrollment requests
    if (!enrollingMode && millis() - lastEnrollCheck >= ENROLL_CHECK_INTERVAL_MS) {
        checkForEnrollment();
        lastEnrollCheck = millis();
    }

    // Clear temporary LCD messages → return to idle
    if (showingMessage && (millis() - lastLcdMessage >= LCD_MESSAGE_DURATION_MS)) {
        lcdShowIdle();
    }

    // Scan cooldown
    if (millis() - lastScanTime < SCAN_COOLDOWN_MS) return;

    // ── Fingerprint scanning ────────────────────────────────────────────────
    int result = scanFingerprint();

    if (result == -1) return;  // No finger

    lastScanTime = millis();

    if (result == -2) {
        lcdShowTemp("Scan Error", "Try Again");
        return;
    }

    if (result == -3) {
        lcdShowTemp("Not Recognized", "Try Again");
        return;
    }

    // ── Fingerprint matched ─────────────────────────────────────────────────
    int guardIdx = findGuardByFingerprint((uint8_t)result);

    if (guardIdx < 0) {
        // ID exists on sensor but not in our local config
        char line2[17];
        snprintf(line2, sizeof(line2), "FP ID:%d", result);
        lcdShowTemp("Unknown ID", line2);
        Serial.printf("[Scan] FP ID %d not in local config\n", result);

        // Still send to server — it might know this guard
        // Build a temporary guardIdx for display
        HTTPClient http;
        String url = String(SERVER_URL) + API_SCAN_PATH;
        http.begin(secureClient, url);
        http.addHeader("Content-Type", "application/json");
        http.setTimeout(HTTP_TIMEOUT_MS);
        String body = "{\"fingerprintId\":" + String(result) + "}";
        int code = http.POST(body);
        if (code == 200) {
            String resp = http.getString();
            JsonDocument doc;
            if (!deserializeJson(doc, resp)) {
                const char* name = doc["guard"]["name"] | "Guard";
                const char* action = doc["action"] | "?";
                char l2[17];
                snprintf(l2, sizeof(l2), "%s OK", action);
                lcdShowTemp(name, l2);
            }
        }
        http.end();
        return;
    }

    // ── Send to server ──────────────────────────────────────────────────────
    Serial.printf("[Scan] %s (FP: %d) → sending to server\n",
                  GUARDS[guardIdx].name, result);
    sendScanToServer((uint8_t)result, guardIdx);
}
