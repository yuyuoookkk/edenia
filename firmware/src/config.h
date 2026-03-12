/******************************************************************************
 * config.h — Edenia Villa Security Attendance System
 * 
 * ⚠️  FILL IN YOUR CREDENTIALS BEFORE FLASHING
 * 
 * This file contains all user-configurable settings:
 * - WiFi credentials
 * - Adafruit IO credentials
 * - Guard profiles (fingerprint ID → name/role/shift mapping)
 * - Hardware pin assignments
 * - Timing constants
 ******************************************************************************/

#ifndef CONFIG_H
#define CONFIG_H

// ═══════════════════════════════════════════════════════════════════════════════
// WiFi Configuration
// ═══════════════════════════════════════════════════════════════════════════════
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// ═══════════════════════════════════════════════════════════════════════════════
// Next.js API Configuration
// The ESP32 will POST fingerprint scans to this endpoint.
// Set this to your Next.js server's IP/hostname on the local network.
// ═══════════════════════════════════════════════════════════════════════════════
#define API_BASE_URL    "http://192.168.1.100:3000"  // ← Change to your server IP
#define API_SCAN_PATH   "/api/attendance/scan"

// ═══════════════════════════════════════════════════════════════════════════════
// Timezone & NTP
// ═══════════════════════════════════════════════════════════════════════════════
#define NTP_SERVER          "pool.ntp.org"
#define UTC_OFFSET_SECONDS  28800   // UTC+8 (WITA / Bali time) = 8 * 3600

// ═══════════════════════════════════════════════════════════════════════════════
// Hardware Pin Assignments
// ═══════════════════════════════════════════════════════════════════════════════

// R307 Fingerprint Sensor (UART)
// Connect sensor TX → ESP32 RX pin, sensor RX → ESP32 TX pin
#define FINGER_RX_PIN   16    // ESP32 GPIO16 (RX2) ← Sensor TX (green wire)
#define FINGER_TX_PIN   17    // ESP32 GPIO17 (TX2) → Sensor RX (white wire)

// 16x2 I2C LCD
// Connect SDA → GPIO21, SCL → GPIO22 (ESP32 default I2C)
#define LCD_I2C_ADDR    0x27  // Common I2C addresses: 0x27 or 0x3F
#define LCD_COLS        16
#define LCD_ROWS        2

// ═══════════════════════════════════════════════════════════════════════════════
// Guard Profiles
// 
// Each guard has a fingerprint ID (enrolled slot on R307, 1-127),
// a display name, role, shift type, and shift start hour.
//
// To add/remove guards:
//   1. Enroll/delete the fingerprint on the R307 sensor
//   2. Update the GUARDS array below
//   3. Update NUM_GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

struct Guard {
    uint8_t  fingerprintID;   // R307 enrolled slot (1–127)
    const char* name;         // Display name (max 16 chars for LCD)
    const char* role;         // Role label
    const char* shift;        // "Day" or "Night"
    uint8_t  shiftStartHour;  // Hour when shift begins (24h format)
    uint8_t  shiftStartMin;   // Minute when shift begins
};

#define NUM_GUARDS 3

const Guard GUARDS[NUM_GUARDS] = {
    // { fingerprintID,  "Name",           "Role",         "Shift", startHour, startMin }
    {    1,              "Putu Darma",     "Security 1",   "Day",   6,         0  },
    {    2,              "Wayan Sudira",   "Security 2",   "Night", 18,        0  },
    {    3,              "Kadek Arta",     "Security 3",   "Day",   6,         0  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Timing Constants
// ═══════════════════════════════════════════════════════════════════════════════
#define HEARTBEAT_INTERVAL_MS   300000    // 5 minutes between heartbeat pings
#define LCD_MESSAGE_DURATION_MS 3000      // How long status messages stay on LCD
#define MQTT_RECONNECT_DELAY_MS 5000      // Delay between MQTT reconnect attempts
#define WIFI_CONNECT_TIMEOUT_MS 15000     // WiFi connection timeout
#define SCAN_COOLDOWN_MS        2000      // Cooldown between consecutive scans

// ═══════════════════════════════════════════════════════════════════════════════
// Firmware Version
// ═══════════════════════════════════════════════════════════════════════════════
#define FW_VERSION "1.0.0"

#endif // CONFIG_H
