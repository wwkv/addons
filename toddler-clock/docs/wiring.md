# Wiring

Target board: **ESP32-S3-DevKitC-1 (N8R8)**. All pins are configurable in
`firmware/src/config.h`; the table below is what the firmware ships with.

## Pin map

| Signal | GPIO | Goes to |
|--------|------|---------|
| TFT SCK | 12 | ST7789 `SCL` |
| TFT MOSI | 11 | ST7789 `SDA` |
| TFT CS | 10 | ST7789 `CS` (some 7-pin modules have none — set `-1` in config) |
| TFT DC | 9 | ST7789 `DC` |
| TFT RST | 8 | ST7789 `RES` |
| Projector lamp PWM | 4 | LED driver PWM/EN input (or MOSFET gate) |
| Night light data | 5 | WS2812 ring `DIN` (through ~330 Ω series resistor) |
| Button | 6 | arcade button → GND (internal pull-up) |
| I2C SDA | 1 | VL53L0X `SDA` + DS3231 `SDA` |
| I2C SCL | 2 | VL53L0X `SCL` + DS3231 `SCL` |

Avoid on the S3: GPIO 0/45/46 (boot straps), 19/20 (USB), 43/44 (UART0),
35–37 (used by the octal PSRAM on N8R8 boards).

## Power

```
USB-C 5V ──┬── ESP32-S3 devkit (5V pin; onboard 3V3 regulator feeds logic)
           ├── WS2812 ring VCC (5V)
           ├── LED driver input → 3W star LED
           └── (optional) IP5306 + 18650 inserted between PSU and this rail
```

- TFT, VL53L0X, DS3231: **3V3** from the devkit, common GND with everything.
- WS2812 data is driven at 3.3 V — 16 LEDs accept this fine in practice; if
  you see glitches, add a level shifter (74AHCT125) or a single "sacrificial"
  pixel close to the ESP32.
- The 3W LED must **never** hang directly on a GPIO: GPIO → driver PWM input
  (or logic-level MOSFET gate + constant-current module) → LED.

## Diagram

```
                        ESP32-S3-DevKitC-1
                       ┌───────────────────┐
        ST7789 TFT     │                   │
       ┌─────────┐     │                   │      ┌──────────────┐
   SCL ┤12       │     │ 4├────────────────┼─────►│ LED driver   │
   SDA ┤11       │     │  │                │      │  PWM in      │
    CS ┤10       │     │ 5├───[330Ω]───────┼─────►│ WS2812 ring  │
    DC ┤ 9       │     │  │                │      └──────────────┘
   RES ┤ 8       │     │ 6├───[button]──GND│
       └─────────┘     │  │                │      ┌──────────────┐
                       │ 1├── SDA ─────────┼──┬──►│ VL53L0X      │
                       │ 2├── SCL ─────────┼──┼──►│ (wave)       │
                       │  │                │  │   ├──────────────┤
                       └───────────────────┘  └──►│ DS3231 RTC   │
                                                  └──────────────┘
```

## Bench-test order

Wire and verify in this order (matches the README bring-up checklist):
TFT → lamp driver (use a plain 5 mm LED + resistor as a stand-in first!) →
WS2812 ring → button → VL53L0X → DS3231.
