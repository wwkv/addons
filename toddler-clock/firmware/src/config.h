#pragma once

// ---------------------------------------------------------------------------
// Feature flags — disable anything not wired up yet; the firmware runs fine
// on a bare devkit with everything off except the display.
// ---------------------------------------------------------------------------
#define HAS_DISPLAY 1  // ST7789 projection panel
#define HAS_LAMP 1     // projector LED (PWM via MOSFET/driver)
#define HAS_RING 1     // WS2812 night light ring
#define HAS_BUTTON 1   // big arcade button
#define HAS_TOF 0      // VL53L0X wave sensor (off until wired: probing an
                       // absent I2C device stalls boot for a few seconds)
#define HAS_RTC 0      // DS3231 (off until wired)

// ---------------------------------------------------------------------------
// Pins — per board, see docs/wiring.md for the full tables
// ---------------------------------------------------------------------------
#if defined(BOARD_LILYGO_T_A7670)
// LilyGo T-A7670x R2 (ESP32-WROVER-E). The A7670 modem reserves GPIO
// 4/5/12/25/26/27/33, battery/solar ADC 35/36, PSRAM 16/17. Lamp and ring
// reuse the SD-slot pins (13/14) — leave the SD slot empty.
constexpr int PIN_TFT_SCK = 18;
constexpr int PIN_TFT_MOSI = 23;
constexpr int PIN_TFT_CS = -1;  // tie the module's CS to GND (if it has one)
constexpr int PIN_TFT_DC = 19;
constexpr int PIN_TFT_RST = 32;

constexpr int PIN_LAMP_PWM = 13;
constexpr int PIN_RING_DATA = 14;
constexpr int PIN_BUTTON = 34;  // input-only: needs external 10k pull-up!
#define PIN_BUTTON_EXTERNAL_PULLUP 1

constexpr int PIN_I2C_SDA = 21;
constexpr int PIN_I2C_SCL = 22;

// Hold the unused LTE modem powered off (saves power, keeps it silent).
constexpr int PIN_MODEM_POWERON = 12;
constexpr int PIN_MODEM_PWRKEY = 4;

#elif CONFIG_IDF_TARGET_ESP32
// Classic ESP32-WROOM DevKit v1 (38-pin). Avoids straps 0/2/12/15,
// input-only 34-39, and flash pins 6-11.
constexpr int PIN_TFT_SCK = 18;
constexpr int PIN_TFT_MOSI = 23;
constexpr int PIN_TFT_CS = 5;  // set -1 for 7-pin modules without CS
constexpr int PIN_TFT_DC = 27;
constexpr int PIN_TFT_RST = 26;

constexpr int PIN_LAMP_PWM = 25;
constexpr int PIN_RING_DATA = 13;
constexpr int PIN_BUTTON = 14;

constexpr int PIN_I2C_SDA = 21;
constexpr int PIN_I2C_SCL = 22;

#else
// ESP32-S3-DevKitC-1
constexpr int PIN_TFT_SCK = 12;
constexpr int PIN_TFT_MOSI = 11;
constexpr int PIN_TFT_CS = 10;  // set -1 for 7-pin modules without CS
constexpr int PIN_TFT_DC = 9;
constexpr int PIN_TFT_RST = 8;

constexpr int PIN_LAMP_PWM = 4;
constexpr int PIN_RING_DATA = 5;
constexpr int PIN_BUTTON = 6;

constexpr int PIN_I2C_SDA = 1;
constexpr int PIN_I2C_SCL = 2;
#endif

// ---------------------------------------------------------------------------
// Hardware constants
// ---------------------------------------------------------------------------
constexpr int RING_NUM_LEDS = 16;

constexpr int LAMP_PWM_CHANNEL = 0;
constexpr int LAMP_PWM_FREQ = 5000;  // Hz, above flicker perception
constexpr int LAMP_PWM_BITS = 10;

// Wave gesture: hand closer than this toggles the night light
constexpr uint16_t TOF_TRIGGER_MM = 100;
constexpr uint32_t TOF_COOLDOWN_MS = 1500;  // ignore re-triggers this long

constexpr uint32_t BUTTON_DEBOUNCE_MS = 40;

// ---------------------------------------------------------------------------
// Network / identity
// ---------------------------------------------------------------------------
#define DEVICE_HOSTNAME "toddlerclock"  // http://toddlerclock.local
#define SETUP_AP_SSID "ToddlerClock-Setup"
#define SETUP_AP_PASS "toddler123"

// Europe/Brussels with DST rules
#define TZ_INFO "CET-1CEST,M3.5.0,M10.5.0/3"
#define NTP_SERVER "pool.ntp.org"
