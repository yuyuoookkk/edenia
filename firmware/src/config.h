/******************************************************************************
 * config.h — Edenia Villa Security Attendance System
 * 
 * ⚠️  FILL IN YOUR CREDENTIALS BEFORE FLASHING
 * 
 * This file contains all user-configurable settings:
 * - WiFi credentials
 * - Server URL (your Next.js backend)
 * - Guard profiles (fingerprint ID → name/role mapping for LCD display)
 * - Hardware pin assignments
 * - Timing constants
 ******************************************************************************/

#ifndef CONFIG_H
#define CONFIG_H

// ═══════════════════════════════════════════════════════════════════════════════
// WiFi Configuration
// ═══════════════════════════════════════════════════════════════════════════════
#define WIFI_SSID       "4G-MIFI-8712"
#define WIFI_PASSWORD   "1234567890"

// ═══════════════════════════════════════════════════════════════════════════════
// Server Configuration
// The ESP32 sends HTTP POST requests directly to your Next.js API.
// Set this to your server's IP on the local network, or your domain.
// ═══════════════════════════════════════════════════════════════════════════════
#define SERVER_URL      "https://edeniaprivatevillas.com"  // Production server
#define API_SCAN_PATH   "/api/attendance/scan"        // Fingerprint scan endpoint
#define API_HEARTBEAT   "/api/attendance/heartbeat"   // Device heartbeat endpoint

// ═══════════════════════════════════════════════════════════════════════════════
// DNS Configuration
// MiFi routers often provide unreliable DNS. Use public DNS servers instead.
// ═══════════════════════════════════════════════════════════════════════════════
#define DNS_PRIMARY     IPAddress(8, 8, 8, 8)        // Google DNS
#define DNS_SECONDARY   IPAddress(1, 1, 1, 1)        // Cloudflare DNS

// ═══════════════════════════════════════════════════════════════════════════════
// Timezone & NTP
// Use IP addresses to bypass MiFi DNS issues with NTP resolution
// ═══════════════════════════════════════════════════════════════════════════════
#define NTP_SERVER          "time.google.com"   // Google NTP (reliable)
#define NTP_SERVER_BACKUP   "pool.ntp.org"       // Fallback
#define UTC_OFFSET_SECONDS  28800               // UTC+8 (WITA / Bali time) = 8 * 3600
#define NTP_RESYNC_INTERVAL_MS 1800000UL          // Force NTP resync every 30 minutes

// ═══════════════════════════════════════════════════════════════════════════════
// Hardware Pin Assignments
// ═══════════════════════════════════════════════════════════════════════════════

// R307 Fingerprint Sensor (UART) — 6-wire version
#define FINGER_RX_PIN   16    // ESP32 GPIO16 (RX2) ← Sensor Pin 3 (TXD)
#define FINGER_TX_PIN   17    // ESP32 GPIO17 (TX2) → Sensor Pin 4 (RXD)

// 16x2 I2C LCD
#define LCD_I2C_ADDR    0x27  // Common addresses: 0x27 or 0x3F
#define LCD_COLS        16
#define LCD_ROWS        2

// ═══════════════════════════════════════════════════════════════════════════════
// Guard Profiles (for LCD display only)
//
// The actual attendance logic (check-in/out, late detection) is handled
// by the Next.js backend. These names are only used for the LCD screen.
//
// fingerprintID MUST match the enrolled slot on the R307 sensor AND
// the fingerprintId in the SecurityGuard database table.
// ═══════════════════════════════════════════════════════════════════════════════

struct Guard {
    uint8_t  fingerprintID;   // R307 enrolled slot (1–127)
    const char* name;         // Display name (max 16 chars for LCD)
    const char* role;         // Role label
};

#define NUM_GUARDS 0

const Guard GUARDS[1] = {
    // Guards are now enrolled from the admin panel.
    // This array is optional — if a fingerprint ID is found here,
    // the LCD will show the name immediately while waiting for
    // the server response. Otherwise it shows "Sending..."
    //
    // Example:
    // { 1, "Putu Darma", "Security 1" },
    { 0, "", "" },  // Placeholder (unused)
};

// ═══════════════════════════════════════════════════════════════════════════════
// Timing Constants
// ═══════════════════════════════════════════════════════════════════════════════
#define HEARTBEAT_INTERVAL_MS   300000UL    // 5 minutes between heartbeat pings
#define COMMAND_CHECK_INTERVAL_MS 5000UL    // Check for server commands every 5 seconds
#define LCD_MESSAGE_DURATION_MS 3000UL      // How long status messages stay on LCD
#define WIFI_CONNECT_TIMEOUT_MS 15000UL     // WiFi connection timeout
#define HTTP_TIMEOUT_MS         10000UL     // HTTP request timeout
#define SCAN_COOLDOWN_MS        2000UL      // Cooldown between consecutive scans
#define AUTO_RESTART_INTERVAL_MS 10800000UL // Auto-restart every 3 hours (3*60*60*1000)

// ═══════════════════════════════════════════════════════════════════════════════
// Firmware Version
// ═══════════════════════════════════════════════════════════════════════════════
#define FW_VERSION "2.0.0"

#endif // CONFIG_H
