# Toddler Projection Clock

A ceiling-projection "sleep trainer" for toddlers who can't read a clock yet.
Instead of digits, it projects **icons** onto the ceiling — a smiley when it's
OK to get out of bed, a sleeping moon when it's not, or any custom image.
It also doubles as a **night light** the toddler can switch on with a big
button or by waving a hand over the device.

Parents control everything from a **web app** served by the device itself on
the local WiFi, and the device integrates with **Home Assistant** over MQTT
(auto-discovery) so symbol changes can be automated ("at 07:00, show the sun").

## How it works

A miniature projector, same principle as commercial projection clocks:

```
3W LED → condenser lens → 1.3" IPS TFT (backlight removed) → C-mount lens → ceiling
```

The TFT acts as a full-color transparent "slide" that the ESP32-S3 can draw
anything on. See [docs/design.md](docs/design.md) for the full architecture and
optics, [docs/bom.md](docs/bom.md) for the parts list, and
[docs/wiring.md](docs/wiring.md) for the pin map.

**High contrast is a core design goal** — the projected background must stay
invisible in a dark bedroom. The measures taken (IPS panel, low default LED
power, LED hard-off on blank, black-interior optics) are documented in
[docs/design.md](docs/design.md#contrast).

## Repository layout

```
toddler-clock/
├── docs/            design, parts list, wiring, enclosure notes
└── firmware/        PlatformIO project (ESP32-S3, Arduino framework)
    ├── src/         firmware modules
    ├── data/        web app, served from LittleFS
    └── tools/       icon preparation script
```

## Quick start (firmware)

Requires [PlatformIO](https://platformio.org/) (`pip install platformio`).

```bash
cd firmware
pio run                    # compile
pio run -t uploadfs        # flash the web app (LittleFS)
pio run -t upload          # flash the firmware
pio device monitor         # watch the serial log
```

Every push to `toddler-clock/firmware/` is also compiled by the
*Toddler Clock Firmware* GitHub Actions workflow, which publishes
`firmware.bin` + `littlefs.bin` as downloadable artifacts.

First boot: the device starts an access point **ToddlerClock-Setup**
(password `toddler123`). Connect to it, browse to `http://192.168.4.1`,
and enter your WiFi credentials under *Settings*. After it joins your
network it is reachable at `http://toddlerclock.local`.

The firmware runs fine on a bare devkit with only the TFT attached — every
sensor/output is behind a feature flag in `src/config.h`, so you can flash
and play with the web app before the rest of the hardware arrives.

## Hardware bring-up checklist

Work through these as parts arrive; each step is independently testable.

1. **Devkit only** — flash firmware + filesystem, join WiFi, open the web app,
   confirm symbol switching in the serial log.
2. **TFT attached** — icons render on the little screen. Enable the *mirror*
   setting and confirm text/icons flip (a projection lens inverts the image).
3. **Backlight surgery** — peel the backlight stack off a *spare* TFT first
   (they're ~€5; expect to sacrifice one learning the technique). Confirm you
   can see through the panel against a lamp.
4. **Optics on the bench** — LED + condenser + TFT + C-mount lens, held by
   hand/clamps in a dark room. Use the built-in **test pattern** screen
   (Settings → Test pattern) to focus and judge contrast.
5. **Dark-room contrast check** — project a blank black frame at the intended
   LED brightness. If the background rectangle is visible from the bed,
   lower the default LED brightness in settings; if still objectionable, try
   the second candidate panel from the BOM.
6. **Night light ring** — wire the WS2812 ring, test color/brightness/timeout
   from the web app.
7. **Button + wave sensor** — wire the arcade button and VL53L0X, confirm both
   toggle the night light.
8. **RTC** — wire the DS3231, confirm the clock survives a WiFi-less reboot.
9. **Home Assistant** — configure MQTT in settings; the device should
   auto-appear with a symbol selector, night light, and projector brightness.
10. **Enclosure** — print and assemble per [docs/enclosure.md](docs/enclosure.md).

## Status

- [x] Design + parts list
- [x] Firmware scaffold: WiFi/AP setup, web app, symbol rendering, night
      light, button + wave triggers, schedules, MQTT/HA discovery, NTP+RTC, OTA
- [ ] Hardware bring-up (waiting on parts)
- [ ] Enclosure STLs (after parts are measured)
- [ ] Nice-to-have: clap/wake-word activation, battery backup
