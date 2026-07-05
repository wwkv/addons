# Bill of materials

Prices are ballpark (AliExpress / TinyTronics / Otronic, mid-2026). Everything
is available in NL/BE webshops if you prefer faster shipping over price.

## Core electronics

| # | Part | Spec / example | ~Price | Notes |
|---|------|----------------|--------|-------|
| 1 | ESP32 board | **€0 if you have spares** — ESP32 DevKit v1 (38-pin) and LilyGo T-A7670x R2 are both supported (`pio run -e esp32-devkit-v1` / `-e lilygo-t-a7670`) | €0–12 | T-A7670's 18650 holder = built-in battery backup (see wiring.md). Buy an ESP32-S3-DevKitC-1 N8R8 (€8–12) only if you later want offline wake-word |
| 2 | Projection TFT ×2 | 1.3" **IPS** ST7789, 240×240, SPI, 7-pin | €4–6 ea | **Buy two**: one gets its backlight peeled (expect to sacrifice one learning). Must be IPS — TN washes out projected black. Alternate candidate: 1.54" ST7789 IPS 240×240 (bigger active area = brighter image, slightly bigger optics) |
| 3 | Projector LED | 3 W white LED on star PCB (or 1 W to start) | €1–2 | Neutral white ~4000 K projects colors nicely |
| 4 | LED driver | logic-level MOSFET (IRLZ44N / AO3400 board) + 700 mA CC buck module (e.g. Mini360 + resistor, or dedicated 700 mA LED driver with PWM/EN input) | €2–4 | PWM from ESP32 into the EN/PWM pin; MOSFET low-side switch if the driver has no enable |
| 5 | Heatsink | small alu heatsink ~20×20 mm for the star LED | €1 | 3 W LED needs it at full power; at our low night levels it barely warms |
| 6 | Condenser lens | collimator lens/reflector for star LEDs, ~20 mm, or a condenser from a cheap "star projector" | €1–3 | Anything that roughly parallelizes the beam onto the 25 mm panel works |
| 7 | Projection lens | 25 mm f/1.4 C-mount CCTV lens | €10–15 | The classic cheap Chinese one; focal length 16–35 mm all workable, 25 mm ≈ 0.8–1 m image at 2 m |
| 8 | Night light ring | WS2812B ring, 16 LEDs (Ø ~68 mm) | €3–4 | Sits under a printed diffuser |
| 9 | Big button | 60 mm arcade dome button | €3–5 | Toddler-proof; LED-illuminated versions exist (wire its LED to the ring supply for a glow-in-dark target) |
| 10 | Wave sensor | VL53L0X time-of-flight breakout | €3–4 | I2C; "hand within 10 cm" gesture |
| 11 | RTC | DS3231 breakout with CR2032 | €2–3 | Clock survives WiFi/power loss |
| 12 | PSU | USB-C 5 V / 2 A wall adapter + USB-C breakout or cable | €5–8 | 2 A covers LED + ring at full blast with margin |

**Core total: ~€45–65**

## Optional battery backup

| Part | Spec | ~Price | Notes |
|------|------|--------|-------|
| Power bank board | IP5306 module (5 V in/out, pass-through) | €2–3 | Powers the 5 V rail while charging its cell |
| Cell | 18650 Li-ion + holder | €5–8 | Hours of runtime with projector at night levels |

Note: pass-through on IP5306 boards varies by clone; test that output stays up
when input power is pulled. Alternative: a LilyGo board with built-in LiPo
management keeps the ESP32 alive, but not the 5 V LED/ring rail.

## Consumables / misc

- Prototyping: breadboard + dupont wires first; 5×7 cm perfboard for final
- Wire, heat-shrink, M2/M3 screws + heat-set inserts for the enclosure
- Matte black spray or black PLA for all optical-path parts
- Craft knife + isopropyl alcohol for the backlight peel

## Backlight removal, in short

1. Unclip/unglue the metal frame on the back of the module.
2. Peel out the backlight stack: reflector, light-guide plate, diffuser
   sheets — they're loose layers behind the glass.
3. Do **not** peel the polarizer films bonded to the glass itself — both must
   stay (rear polarizer is part of how the LCD modulates light).
4. Clean fingerprints with IPA. The panel is now a transparent color slide.

Practice on TFT #2 first. Detailed walk-through with photos:
[shufps/diy-projector-clock](https://github.com/shufps/diy-projector-clock).
