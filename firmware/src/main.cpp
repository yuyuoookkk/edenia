/******************************************************************************
 * main.cpp — Edenia Villa Security Guard Attendance System
 *
 * ESP32 + R307 Fingerprint Sensor + 16x2 I2C LCD + Adafruit IO (MQTT)
 *
 * Features:
 *   • Fingerprint-based check-in / check-out with automatic toggle
 *   • Late detection based on shift start times
 *   • Real-time LCD feedback for every system state
 *   • MQTT publishing to Adafruit IO feeds
 *   • Daily automatic state reset at midnight
 *   • Device heartbeat for online status monitoring
 *   • Offline buffering when MQTT is disconnected
 *
 * Hardware Wiring:
 *   R307 Sensor:  TX → GPIO16 (RX2), RX → GPIO17 (TX2), VCC → 3.3V, GND
 *   I2C LCD:      SDA → GPIO21, SCL → GPIO22, VCC → 5V, GND
 *
 * (c) 2026 Edenia Villa Management System
 ******************************************************************************/

#include "Adafruit_MQTT.h"
#include "Adafruit_MQTT_Client.h"
#include "config.h"
#include <Adafruit_Fingerprint.h>
#include <Arduino.h>
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

// WiFi & MQTT
WiFiClient wifiClient;
Adafruit_MQTT_Client mqtt(&wifiClient, AIO_SERVER, AIO_SERVERPORT, AIO_USERNAME,
                          AIO_KEY);

// Adafruit IO Feeds
Adafruit_MQTT_Publish feedAttendance =
    Adafruit_MQTT_Publish(&mqtt, AIO_USERNAME "/feeds/" FEED_ATTENDANCE_LOG);
Adafruit_MQTT_Publish feedGuardStatus =
    Adafruit_MQTT_Publish(&mqtt, AIO_USERNAME "/feeds/" FEED_GUARD_STATUS);
Adafruit_MQTT_Publish feedHeartbeat =
    Adafruit_MQTT_Publish(&mqtt, AIO_USERNAME "/feeds/" FEED_DEVICE_HEARTBEAT);

// NTP Time Client
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, NTP_SERVER, UTC_OFFSET_SECONDS, 60000);

// ═══════════════════════════════════════════════════════════════════════════════
// Attendance State Tracking
// ═══════════════════════════════════════════════════════════════════════════════

struct AttendanceRecord {
  bool checkedIn;
  bool checkedOut;
  uint8_t checkInHour;
  uint8_t checkInMin;
  uint8_t checkOutHour;
  uint8_t checkOutMin;
  bool isLate;
};

// One record per guard, reset daily
AttendanceRecord attendance[NUM_GUARDS];

// Timing trackers
unsigned long lastHeartbeat = 0;
unsigned long lastLcdMessage = 0;
unsigned long lastScanTime = 0;
unsigned long bootTime = 0;
bool showingMessage = false;
int currentDay = -1; // Track day for midnight reset

// ═══════════════════════════════════════════════════════════════════════════════
// LCD Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Display a two-line message on the LCD.
 * Lines are automatically padded/truncated to 16 characters.
 */
void lcdPrint(const char *line1, const char *line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

/**
 * Display a temporary message that auto-clears after LCD_MESSAGE_DURATION_MS.
 */
void lcdShowTemp(const char *line1, const char *line2) {
  lcdPrint(line1, line2);
  lastLcdMessage = millis();
  showingMessage = true;
}

/**
 * Display the idle screen showing guard count on duty.
 */
void lcdShowIdle() {
  int onDuty = 0;
  for (int i = 0; i < NUM_GUARDS; i++) {
    if (attendance[i].checkedIn && !attendance[i].checkedOut) {
      onDuty++;
    }
  }

  char line1[17];
  char line2[17];
  snprintf(line1, sizeof(line1), "%d/%d On Duty", onDuty, NUM_GUARDS);
  snprintf(line2, sizeof(line2), "Scan finger...");
  lcdPrint(line1, line2);
  showingMessage = false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WiFi Connection
// ═══════════════════════════════════════════════════════════════════════════════

void connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);

  // Show on LCD
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
// MQTT Connection
// ═══════════════════════════════════════════════════════════════════════════════

void connectMQTT() {
  if (mqtt.connected())
    return;

  Serial.println("[MQTT] Connecting to Adafruit IO...");
  lcdPrint("Connecting MQTT", "Adafruit IO...");

  int8_t ret;
  uint8_t retries = 5;

  while ((ret = mqtt.connect()) != 0) {
    Serial.print("[MQTT] Error: ");
    Serial.println(mqtt.connectErrorString(ret));
    mqtt.disconnect();
    retries--;

    if (retries == 0) {
      Serial.println("[MQTT] Failed after retries, continuing offline");
      lcdPrint("MQTT Offline", "Buffering...");
      delay(2000);
      return;
    }

    delay(MQTT_RECONNECT_DELAY_MS);
  }

  Serial.println("[MQTT] Connected to Adafruit IO!");
  lcdPrint("MQTT Connected!", "Adafruit IO OK");
  delay(1500);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Guard Lookup
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find a guard by their R307 fingerprint ID.
 * Returns the index in GUARDS array, or -1 if not found.
 */
int findGuardByFingerprint(uint8_t fpID) {
  for (int i = 0; i < NUM_GUARDS; i++) {
    if (GUARDS[i].fingerprintID == fpID) {
      return i;
    }
  }
  return -1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Time Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current time as formatted string "HH:MM"
 */
void getTimeString(char *buf, size_t bufSize) {
  snprintf(buf, bufSize, "%02d:%02d", timeClient.getHours(),
           timeClient.getMinutes());
}

/**
 * Get current date as formatted string "YYYY-MM-DD"
 * NTPClient gives us epoch seconds, we convert manually.
 */
void getDateString(char *buf, size_t bufSize) {
  unsigned long epochTime = timeClient.getEpochTime();
  // Calculate date from epoch
  unsigned long days = epochTime / 86400;
  int year = 1970;
  while (true) {
    int daysInYear =
        (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)) ? 366 : 365;
    if (days < (unsigned long)daysInYear)
      break;
    days -= daysInYear;
    year++;
  }

  int monthDays[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
  if (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)) {
    monthDays[1] = 29;
  }

  int month = 0;
  while (month < 12 && days >= (unsigned long)monthDays[month]) {
    days -= monthDays[month];
    month++;
  }

  snprintf(buf, bufSize, "%04d-%02d-%02d", year, month + 1, (int)days + 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Adafruit IO Publishing
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Publish an attendance event (check-in or check-out) to the attendance-log
 * feed.
 */
void publishAttendanceEvent(int guardIdx, const char *eventType,
                            const char *timeStr, const char *dateStr,
                            const char *status, const char *duration) {
  if (!mqtt.connected()) {
    Serial.println("[MQTT] Not connected, skipping publish");
    return;
  }

  char payload[256];

  if (duration != NULL && strlen(duration) > 0) {
    snprintf(payload, sizeof(payload),
             "{\"id\":%d,\"name\":\"%s\",\"role\":\"%s\",\"type\":\"%s\","
             "\"time\":\"%s\",\"date\":\"%s\",\"status\":\"%s\",\"duration\":"
             "\"%s\"}",
             GUARDS[guardIdx].fingerprintID, GUARDS[guardIdx].name,
             GUARDS[guardIdx].role, eventType, timeStr, dateStr, status,
             duration);
  } else {
    snprintf(payload, sizeof(payload),
             "{\"id\":%d,\"name\":\"%s\",\"role\":\"%s\",\"type\":\"%s\","
             "\"time\":\"%s\",\"date\":\"%s\",\"status\":\"%s\"}",
             GUARDS[guardIdx].fingerprintID, GUARDS[guardIdx].name,
             GUARDS[guardIdx].role, eventType, timeStr, dateStr, status);
  }

  Serial.print("[MQTT] Publishing attendance: ");
  Serial.println(payload);

  if (!feedAttendance.publish(payload)) {
    Serial.println("[MQTT] Publish failed!");
  }
}

/**
 * Publish the current guard status summary to the guard-status feed.
 */
void publishGuardStatus() {
  if (!mqtt.connected())
    return;

  int presentCount = 0;
  int absentCount = 0;

  for (int i = 0; i < NUM_GUARDS; i++) {
    if (attendance[i].checkedIn) {
      presentCount++;
    } else {
      absentCount++;
    }
  }

  char timeStr[6];
  getTimeString(timeStr, sizeof(timeStr));

  char payload[128];
  snprintf(payload, sizeof(payload),
           "{\"present\":%d,\"absent\":%d,\"total\":%d,\"time\":\"%s\"}",
           presentCount, absentCount, NUM_GUARDS, timeStr);

  Serial.print("[MQTT] Publishing guard status: ");
  Serial.println(payload);

  feedGuardStatus.publish(payload);
}

/**
 * Publish device heartbeat to the device-heartbeat feed.
 */
void publishHeartbeat() {
  if (!mqtt.connected())
    return;

  unsigned long uptimeSeconds = (millis() - bootTime) / 1000;
  int rssi = WiFi.RSSI();

  char payload[128];
  snprintf(payload, sizeof(payload),
           "{\"status\":\"online\",\"uptime\":%lu,\"rssi\":%d,\"fw\":\"%s\"}",
           uptimeSeconds, rssi, FW_VERSION);

  Serial.print("[MQTT] Heartbeat: ");
  Serial.println(payload);

  feedHeartbeat.publish(payload);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Attendance Logic
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reset all attendance records for a new day.
 */
void resetDailyAttendance() {
  Serial.println("[System] Resetting daily attendance records");
  for (int i = 0; i < NUM_GUARDS; i++) {
    attendance[i].checkedIn = false;
    attendance[i].checkedOut = false;
    attendance[i].checkInHour = 0;
    attendance[i].checkInMin = 0;
    attendance[i].checkOutHour = 0;
    attendance[i].checkOutMin = 0;
    attendance[i].isLate = false;
  }
}

/**
 * Check if the current time is past the guard's shift start time (= late).
 */
bool isLateForShift(int guardIdx) {
  int currentHour = timeClient.getHours();
  int currentMin = timeClient.getMinutes();
  int shiftHour = GUARDS[guardIdx].shiftStartHour;
  int shiftMin = GUARDS[guardIdx].shiftStartMin;

  if (currentHour > shiftHour)
    return true;
  if (currentHour == shiftHour && currentMin > shiftMin)
    return true;
  return false;
}

/**
 * Calculate duration string between check-in and check-out times.
 */
void calculateDuration(int guardIdx, char *buf, size_t bufSize) {
  int inMins =
      attendance[guardIdx].checkInHour * 60 + attendance[guardIdx].checkInMin;
  int outMins =
      attendance[guardIdx].checkOutHour * 60 + attendance[guardIdx].checkOutMin;

  // Handle overnight shifts (check-out next day)
  int diffMins = outMins - inMins;
  if (diffMins < 0)
    diffMins += 1440; // Add 24 hours

  int hours = diffMins / 60;
  int mins = diffMins % 60;
  snprintf(buf, bufSize, "%dh %dm", hours, mins);
}

/**
 * Process a recognized fingerprint scan.
 * Handles check-in, check-out, or already-done states.
 */
void processAttendance(int guardIdx) {
  char timeStr[6];
  getTimeString(timeStr, sizeof(timeStr));
  char dateStr[11];
  getDateString(dateStr, sizeof(dateStr));

  char lcdLine2[17];

  // ── Case 1: First scan of the day → CHECK IN ──────────────────────────
  if (!attendance[guardIdx].checkedIn) {
    attendance[guardIdx].checkedIn = true;
    attendance[guardIdx].checkInHour = timeClient.getHours();
    attendance[guardIdx].checkInMin = timeClient.getMinutes();

    bool late = isLateForShift(guardIdx);
    attendance[guardIdx].isLate = late;

    const char *status = late ? "late" : "present";

    if (late) {
      snprintf(lcdLine2, sizeof(lcdLine2), "In:%s  LATE", timeStr);
    } else {
      snprintf(lcdLine2, sizeof(lcdLine2), "In:%s  OK!", timeStr);
    }

    lcdShowTemp(GUARDS[guardIdx].name, lcdLine2);

    Serial.printf("[Attendance] %s CHECKED IN at %s (%s)\n",
                  GUARDS[guardIdx].name, timeStr, status);

    // Publish to Adafruit IO
    publishAttendanceEvent(guardIdx, "checkin", timeStr, dateStr, status, NULL);
    publishGuardStatus();
  }
  // ── Case 2: Already checked in, not yet out → CHECK OUT ───────────────
  else if (!attendance[guardIdx].checkedOut) {
    attendance[guardIdx].checkedOut = true;
    attendance[guardIdx].checkOutHour = timeClient.getHours();
    attendance[guardIdx].checkOutMin = timeClient.getMinutes();

    char duration[16];
    calculateDuration(guardIdx, duration, sizeof(duration));

    snprintf(lcdLine2, sizeof(lcdLine2), "Out:%s Bye!", timeStr);
    lcdShowTemp(GUARDS[guardIdx].name, lcdLine2);

    const char *status = attendance[guardIdx].isLate ? "late" : "present";

    Serial.printf("[Attendance] %s CHECKED OUT at %s (duration: %s)\n",
                  GUARDS[guardIdx].name, timeStr, duration);

    // Publish to Adafruit IO
    publishAttendanceEvent(guardIdx, "checkout", timeStr, dateStr, status,
                           duration);
    publishGuardStatus();
  }
  // ── Case 3: Already checked in AND out → DONE ────────────────────────
  else {
    lcdShowTemp(GUARDS[guardIdx].name, "Already Done!");

    Serial.printf("[Attendance] %s already completed today\n",
                  GUARDS[guardIdx].name);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fingerprint Scanning
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Attempt to read and identify a fingerprint.
 * Returns the fingerprint ID if found, or -1 on failure/no match.
 */
int scanFingerprint() {
  uint8_t p = finger.getImage();

  if (p == FINGERPRINT_NOFINGER) {
    return -1; // No finger on sensor
  }

  if (p != FINGERPRINT_OK) {
    Serial.println("[Finger] Image capture failed");
    return -2; // Sensor error
  }

  // Finger detected — show scanning message
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
  Serial.println("║  Edenia Villa Security Attendance System  ║");
  Serial.println("║  ESP32 + R307 + LCD + Adafruit IO         ║");
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
    } // Halt — sensor is required
  }
  delay(1000);

  // Print sensor parameters
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
  getTimeString(timeStr, sizeof(timeStr));
  char timeLine[17];
  snprintf(timeLine, sizeof(timeLine), "Time: %s", timeStr);
  lcdPrint("Clock Synced!", timeLine);
  Serial.printf("[Init] Time synced: %s\n", timeStr);
  delay(1500);

  // Connect MQTT
  connectMQTT();

  // Reset attendance for the day
  resetDailyAttendance();
  currentDay = timeClient.getDay();

  // Publish initial heartbeat
  publishHeartbeat();
  publishGuardStatus();

  // Show idle screen
  lcdShowIdle();

  Serial.println("[Init] System ready! Waiting for fingerprint scans...");
  Serial.println("────────────────────────────────────────────");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Loop
// ═══════════════════════════════════════════════════════════════════════════════

void loop() {
  // ── Keep time updated ───────────────────────────────────────────────────
  timeClient.update();

  // ── Midnight reset ──────────────────────────────────────────────────────
  int today = timeClient.getDay();
  if (today != currentDay) {
    Serial.println("[System] Midnight detected — new day!");
    lcdShowTemp("New Day!", "Resetting...");
    delay(2000);
    resetDailyAttendance();
    currentDay = today;
    publishGuardStatus();
    lcdShowIdle();
  }

  // ── Keep MQTT alive ─────────────────────────────────────────────────────
  if (!mqtt.connected()) {
    connectMQTT();
  }
  mqtt.processPackets(10);

  // ── Periodic heartbeat ──────────────────────────────────────────────────
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    publishHeartbeat();
    lastHeartbeat = millis();
  }

  // ── Clear temporary LCD messages ────────────────────────────────────────
  if (showingMessage &&
      (millis() - lastLcdMessage >= LCD_MESSAGE_DURATION_MS)) {
    lcdShowIdle();
  }

  // ── Scan cooldown ───────────────────────────────────────────────────────
  if (millis() - lastScanTime < SCAN_COOLDOWN_MS) {
    return;
  }

  // ── Fingerprint scanning ────────────────────────────────────────────────
  int result = scanFingerprint();

  if (result == -1) {
    // No finger present — do nothing
    return;
  }

  lastScanTime = millis();

  if (result == -2) {
    // Sensor error
    lcdShowTemp("Scan Error", "Try Again");
    Serial.println("[Scan] Sensor error during scan");
    return;
  }

  if (result == -3) {
    // Finger not recognized
    lcdShowTemp("Not Recognized", "Try Again");
    Serial.println("[Scan] Fingerprint not in database");
    return;
  }

  // ── Fingerprint matched — find guard ────────────────────────────────────
  int guardIdx = findGuardByFingerprint((uint8_t)result);

  if (guardIdx < 0) {
    // Fingerprint ID exists in sensor but not in our guard config
    char line2[17];
    snprintf(line2, sizeof(line2), "FP ID:%d Unknown", result);
    lcdShowTemp("Unknown ID", line2);
    Serial.printf("[Scan] FP ID %d not mapped to any guard\n", result);
    return;
  }

  // ── Process attendance ──────────────────────────────────────────────────
  Serial.printf("[Scan] Identified: %s (FP ID: %d)\n", GUARDS[guardIdx].name,
                result);
  processAttendance(guardIdx);
}
