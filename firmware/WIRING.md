``` 
                          ┌─────────────────────┐
                          │     ESP32 DevKit     │
                          │                       │
     R307 Sensor          │  3V3 ●───────────┐   │          I2C LCD 16x2
    ┌───────────┐         │                   │   │         ┌──────────────┐
    │           │         │  GND ●──────┬─────┼───┼────●──● │ GND          │
    │  ┌─────┐  │         │             │     │   │    │    │              │
    │  │ FP  │  │   RED   │  5V  ●──────┼─────┼───┼────┼──● │ VCC          │
    │  │Scan │  │  ──────●│             │     │   │    │    │              │
    │  │     │  │         │             │     │   │    │    │              │
    │  └─────┘  │         │ G16  ●◄─GREEN─────┤   │    │    │              │
    │           │         │             │     │   │    │    │              │
    │  TX ●─────┼─GREEN──►│ G16 (RX2)   │     │   │    │    │              │
    │  RX ●◄────┼─WHITE───│ G17 (TX2)   │     │   │    │    │              │
    │ VCC ●─────┼─RED─────│ 3V3         │     │   │    │    │              │
    │ GND ●─────┼─BLACK───│ GND ────────┘     │   │    │    │              │
    │           │         │                   │   │    │    │              │
    └───────────┘         │ G21 (SDA) ●───BLUE┼───┼────┼──● │ SDA          │
                          │ G22 (SCL) ●──YELLOW───┼────┼──● │ SCL          │
                          │                       │    │    │              │
                          └─────────────────────┘    │    └──────────────┘
                                                      │
                                                  Common GND
```

---

## Connection Table

### R307 Fingerprint Sensor (6-Wire) → ESP32

The R307 has **6 wires**. All 6 must be connected:

| R307 Pin | Wire Color | ESP32 Pin | Notes |
|----------|-----------|-----------|-------|
| **Pin 1 — VCC** | 🔴 Red | **3.3V** | ⚠️ Use 3.3V, NOT 5V! |
| **Pin 2 — GND** | ⚫ Black | **GND** | Common ground |
| **Pin 3 — TXD** | 🟡 Yellow | **GPIO16** (RX2) | Sensor TX → ESP32 RX (crossed!) |
| **Pin 4 — RXD** | 🟢 Green | **GPIO17** (TX2) | ESP32 TX → Sensor RX (crossed!) |
| **Pin 5 — Touch (WAKEUP)** | 🔵 Blue | **GPIO4** | Goes HIGH when finger detected (optional but recommended) |
| **Pin 6 — 3.3V (Touch Power)** | ⚪ White | **3.3V** | Powers the touch detection circuit |

> ⚠️ **Wire colors may vary** between manufacturers! Always check the label printed on your sensor's ribbon cable or datasheet. The pin ORDER (1–6) is what matters.
>
> 💡 **Pin 5 (Touch/Wakeup)** is optional — the system works without it. But if connected, it allows the ESP32 to detect a finger **before** starting a scan, which saves power and speeds up response. If you don't connect it, leave it disconnected (do NOT connect to GND).

### 16x2 I2C LCD → ESP32

| LCD Pin | Wire Color | ESP32 Pin | Notes |
|---------|-----------|-----------|-------|
| **SDA** | 🔵 Blue | **GPIO21** | ESP32 default I2C SDA |
| **SCL** | 🟡 Yellow | **GPIO22** | ESP32 default I2C SCL |
| **VCC** | 🔴 Red | **5V** (VIN) | LCD needs 5V for backlight |
| **GND** | ⚫ Black | **GND** | Common ground |

> 💡 **LCD I2C Address:** Default is `0x27`. If your LCD doesn't display anything, try `0x3F`. You can run an I2C scanner sketch to find the correct address.

---

## Pin Summary (ESP32 DevKit)

```
ESP32 Pin    │ Connected To        │ Purpose
─────────────┼─────────────────────┼─────────────────────────
GPIO16 (RX2) │ R307 Pin 3 (TXD)    │ Receive fingerprint data
GPIO17 (TX2) │ R307 Pin 4 (RXD)    │ Send commands to sensor
GPIO4        │ R307 Pin 5 (Touch)  │ Finger detection signal (optional)
GPIO21 (SDA) │ LCD SDA             │ I2C data line
GPIO22 (SCL) │ LCD SCL             │ I2C clock line
3.3V         │ R307 VCC + Touch Pwr│ Power for sensor (Pin 1 & Pin 6)
5V (VIN)     │ LCD VCC             │ Power for LCD + backlight
GND          │ R307 GND + LCD GND  │ Common ground (shared)
```

---

## Breadboard Layout Tips

1. **Power rails:** Connect ESP32 `3.3V` to one power rail, `5V` to another, and `GND` to the ground rail
2. **Common ground:** Both the R307 and LCD GND wires connect to the same ground rail
3. **Keep UART wires short:** Long wires between R307 and ESP32 can cause communication errors
4. **LCD placement:** Place the LCD at the edge of the breadboard so you can read it easily

---

## Testing the Connections

### Test 1: LCD
Flash any I2C scanner sketch to verify the LCD is detected at address `0x27` or `0x3F`.

### Test 2: R307 Sensor
Flash the **Adafruit Fingerprint Sensor Library → Examples → fingerprint_test** sketch. Open Serial Monitor at 115200 baud. You should see "Found fingerprint sensor!" if wired correctly.

### Test 3: Full System
Flash the attendance firmware (`pio run -t upload`). The LCD should show the boot sequence: `Edenia Security` → `Starting...` → `Sensor OK` → WiFi → MQTT → Idle.
