# Wiring

Three supported boards; build with `pio run -e <env>`. All pins live in
`firmware/src/config.h` and can be changed there.

| Board | PlatformIO env | When to use |
|-------|----------------|-------------|
| ESP32 DevKit v1 (38-pin WROOM) | `esp32-devkit-v1` | You have spares — start here |
| LilyGo T-A7670x R2 (WROVER-E + LTE) | `lilygo-t-a7670` | Want built-in 18650 battery backup |
| ESP32-S3-DevKitC-1 N8R8 | `esp32-s3-devkitc-1` | Reference board; needed only for a future wake-word feature |

## Pin maps

| Signal | DevKit v1 | T-A7670 R2 | S3-DevKitC-1 | Goes to |
|--------|-----------|------------|--------------|---------|
| TFT SCK | 18 | 18 | 12 | ST7789 `SCL` |
| TFT MOSI | 23 | 23 | 11 | ST7789 `SDA` |
| TFT CS | 5 | — (tie to GND) | 10 | ST7789 `CS` (set `-1` in config for 7-pin modules without CS) |
| TFT DC | 27 | 19 | 9 | ST7789 `DC` |
| TFT RST | 26 | 32 | 8 | ST7789 `RES` |
| Projector lamp PWM | 25 | 13 | 4 | LED driver PWM/EN input (or MOSFET gate) |
| Night light data | 13 | 14 | 5 | WS2812 ring `DIN` (through ~330 Ω series resistor) |
| Button | 14 | 34 ⚠ | 6 | arcade button → GND |
| I2C SDA | 21 | 21 | 1 | VL53L0X `SDA` + DS3231 `SDA` |
| I2C SCL | 22 | 22 | 2 | VL53L0X `SCL` + DS3231 `SCL` |

⚠ **T-A7670 button**: GPIO 34 is input-only and has *no internal pull-up* —
wire an external 10 kΩ resistor from GPIO 34 to 3V3 (button still switches to
GND). The firmware handles this automatically for the `lilygo-t-a7670` env.

### Pins to stay away from

- **DevKit v1 (classic ESP32):** 0/2/12/15 (boot straps), 6–11 (flash),
  34–39 (input-only), 1/3 (UART0/USB serial).
- **T-A7670 R2:** everything the modem owns — 4 (PWRKEY), 5 (RESET),
  12 (POWERON), 25 (DTR), 26/27 (UART), 33 (RI) — plus 35/36
  (battery/solar ADC), 16/17 (PSRAM), and the same strap/flash/UART pins as
  above. Lamp (13) and ring (14) reuse the SD-card slot pins: **leave the SD
  slot empty**. The firmware holds the modem powered off at boot.
- **S3-DevKitC-1:** 0/45/46 (straps), 19/20 (USB), 43/44 (UART0),
  35–37 (octal PSRAM on N8R8).

## Power

```
USB 5V ──┬── devkit 5V/VIN pin (onboard 3V3 regulator feeds logic)
         ├── WS2812 ring VCC (5V)
         ├── LED driver input → 3W star LED
         └── (optional) IP5306 + 18650 inserted between PSU and this rail
```

- TFT, VL53L0X, DS3231: **3V3** from the devkit, common GND with everything.
- **T-A7670 note:** the board's own 18650 holder + charger backs up the ESP32
  itself — a power cut keeps the clock, schedule, and WiFi alive. The 5 V
  rail for the LED/ring is *not* battery-backed (the board can't source 5 V
  from the cell), which is fine: projector and night light are luxuries
  during an outage. Skip the IP5306 option unless you want those too.
- WS2812 data is driven at 3.3 V — 16 LEDs accept this fine in practice; if
  you see glitches, add a level shifter (74AHCT125) or a single "sacrificial"
  pixel close to the ESP32.
- The 3W LED must **never** hang directly on a GPIO: GPIO → driver PWM input
  (or logic-level MOSFET gate + constant-current module) → LED.

## Diagram (DevKit v1 pins shown)

```
                         ESP32 DevKit v1
                       ┌───────────────────┐
        ST7789 TFT     │                   │
       ┌─────────┐     │                   │      ┌──────────────┐
   SCL ┤18       │     │25├────────────────┼─────►│ LED driver   │
   SDA ┤23       │     │  │                │      │  PWM in      │
    CS ┤ 5       │     │13├───[330Ω]───────┼─────►│ WS2812 ring  │
    DC ┤27       │     │  │                │      └──────────────┘
   RES ┤26       │     │14├───[button]──GND│
       └─────────┘     │  │                │      ┌──────────────┐
                       │21├── SDA ─────────┼──┬──►│ VL53L0X      │
                       │22├── SCL ─────────┼──┼──►│ (wave)       │
                       └───────────────────┘  │   ├──────────────┤
                                              └──►│ DS3231 RTC   │
                                                  └──────────────┘
```

## Bench-test order

Wire and verify in this order (matches the README bring-up checklist):
TFT → lamp driver (use a plain 5 mm LED + resistor as a stand-in first!) →
WS2812 ring → button → VL53L0X → DS3231.
