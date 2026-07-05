# Design

## Goal

A bedside device for a toddler's room that:

1. **Projects a symbol on the ceiling** (smiley, moon, animal, later a clock
   face) so a child who can't read a clock knows whether they may get up.
2. Acts as a **night light** the toddler can turn on with a big button or by
   waving a hand over the device.
3. Is **controlled by parents** via a web app on the local WiFi and via
   Home Assistant (MQTT auto-discovery) for schedules/automations.

Mains powered (USB-C). Optional battery backup so the clock and schedule
survive short power cuts.

## How commercial projection clocks work

The bol.com-style projection clock is a miniature slide projector:
a bright LED shines through a **condenser lens** into a small **transmissive
negative-mode LCD** (black background, transparent digits), and an adjustable
**objective lens** focuses that image on the ceiling. No laser, no special
tech — just an LED, an LCD used as a light valve, and two lenses.

## Our projection path

To project *arbitrary* graphics instead of fixed digits, we replace the
segment LCD with a small pixel-addressable panel:

```
                       ┌───────────── 3D-printed light tube ─────────────┐
  3W white LED ──► condenser lens ──► 1.3" IPS TFT ──► 25mm C-mount lens ──► ceiling
  (PWM dimmed)     (collimates)      (backlight       (screws in/out
                                      removed)          to focus)
```

- The TFT's backlight stack (diffuser + light guide + reflector films) is
  peeled off, leaving a transparent color LCD ~1" across.
- A cheap 25 mm f/1.4 C-mount CCTV lens projects it. At ~2 m ceiling distance
  this gives roughly a 0.8–1 m image (≈80× magnification). Focus by screwing
  the lens in its printed thread; aim by tilting the printed head.
- Proven approach: [shufps/diy-projector-clock](https://github.com/shufps/diy-projector-clock)
  built exactly this optical path with an STM32 and reports the cheap Chinese
  C-mount lenses work nearly perfectly at this image size.

### Why not…

- **OLED**: emissive and opaque — it cannot be backlit, and its own light
  output (a few mW) is thousands of times too weak to survive being spread
  over a square meter of ceiling. Every projector uses a lamp + light valve
  (LCD/DLP/LCOS) for this reason.
- **LED matrix + lens**: much simpler, but 16×16 blobs, not real icons.
- **GOBO wheel** (printed transparency + stepper): infinite contrast but a
  fixed symbol set and no clock face. Kept as the documented fallback if TFT
  contrast ever disappoints.

<a name="contrast"></a>
## Contrast (core requirement)

The projected *black* must stay imperceptible from the bed in a dark room.
What the child should see is the icon, not a glowing rectangle. Measures, in
order of impact:

1. **IPS panel only.** IPS ST7789 modules have ~1000:1 native contrast, so the
   black background leaks ~0.1% of icon brightness. TN panels (most ST7735
   modules) are ruled out — poor off-axis contrast washes out projected black.
2. **Low LED power by default.** Background leakage scales 1:1 with lamp
   power, and a dark room needs *very little* light for a clearly visible
   icon. Projector brightness is a parent-facing setting (also exposed to HA)
   with a deliberately low default, plus an optional night auto-dim.
3. **LED hard-off on blank.** When the state is "off"/no symbol, the firmware
   cuts the LED via its MOSFET — true black, zero leakage, and no light bleed
   while the child falls asleep.
4. **Icons authored on pure black.** Built-in icons are drawn on `0x0000`;
   custom uploaded icons are composited onto black.
5. **Optics housekeeping.** Matte-black interior, a baffle aperture that masks
   the TFT's bright edge (the panel border leaks far more than pixels), and a
   short hood on the lens tube against stray spill. See
   [enclosure.md](enclosure.md).
6. **Built-in test pattern** (checkerboard + full-black frame) reachable from
   the web app for focusing and judging contrast during bring-up.

Escalation path if a visible background remains: try the alternate panel from
the BOM; final fallback is a GOBO wheel.

## Electronics architecture

```
                            ┌──────────────────────────┐
   USB-C 5V ──(optional     │       ESP32-S3 (N8R8)    │
   IP5306+18650 backup)──►  │                          │
                            │ SPI ──► ST7789 TFT       │──► projection head
                            │ PWM ──► MOSFET ──► 3W LED│
                            │ RMT ──► WS2812 ring (16) │──► night light diffuser
                            │ GPIO ◄─ arcade button    │
                            │ I2C ◄─► VL53L0X (wave)   │
                            │      └─► DS3231 RTC      │
                            └──────────────────────────┘
```

- **ESP32-S3** (dual core, PSRAM): graphics + async web server + MQTT with
  room to spare; native USB for flashing; supports offline wake-word later
  if we ever want voice activation.
- **DS3231 RTC**: time survives WiFi outages and reboots; its coin cell is a
  free "battery backup" for the *clock* even without the power-bank option.
- **VL53L0X** time-of-flight sensor pointing up: "hand within 10 cm" = wave
  gesture. More reliable than IR reflectance and immune to ambient light.

## Firmware architecture

PlatformIO, Arduino framework. Modules (see `firmware/src/`):

| Module        | Responsibility |
|---------------|----------------|
| `config.h`    | pin map + feature flags (`HAS_TOF`, `HAS_RTC`, …) so a bare devkit still builds and runs |
| `settings`    | persisted config (NVS Preferences): WiFi, MQTT, night light, brightness, schedule |
| `state`       | single source of truth: current symbol, night light on/off, auto-off timer, schedule evaluation |
| `display`     | LovyanGFX rendering: built-in procedural icons, PNG icons from LittleFS, clock face, test pattern, mirror mode (lens flips the image), lamp PWM control |
| `nightlight`  | FastLED WS2812 ring: color, brightness, fade in/out, timeout |
| `triggers`    | button debounce + VL53L0X wave detection → toggle night light |
| `webserver`   | serves the SPA from LittleFS; REST API + WebSocket push; icon upload |
| `mqtt`        | Home Assistant MQTT discovery: symbol `select`, night light `light`, projector brightness `number`, button `event` |
| `timekeeping` | NTP (Europe/Brussels) with DS3231 fallback/persist |
| `main`        | boot, WiFi with captive-portal fallback AP, mDNS (`toddlerclock.local`), OTA |

### State model

```
symbol: "off" | "clock" | built-in icon id | "custom:<file>"
nightlight: { on, color, brightness, timeout_s }
schedule: [ { "hh:mm", symbol }, ... ]   // evaluated every minute, local time
```

Everything that changes state goes through `state` and is broadcast to web
clients (WebSocket) and MQTT, so the web app, HA, button, and schedule can
never disagree about what the device is doing.

### Control surface

- **Web app** (`firmware/data/www/`): vanilla HTML/JS, no build step, all
  assets inline (SVG icons, data-URI favicon). Playful mobile-first UI:
  a live "ceiling view" hero showing what's projected right now, three
  swipeable full-screen panels (Symbol / Night light / Schedule) via CSS
  scroll-snap, big squishy buttons, hue + brightness sliders, haptic
  feedback, and a hold-1s "grown-up corner" for WiFi/MQTT/projector
  settings. Develop it without hardware: `python3 tools/mock_device.py`
  serves the app with a fake device behind it.

- **WebSocket `/ws` — hot paths.** On connect (and after every change) the
  server pushes the full state JSON to all clients, so multiple phones, HA,
  the schedule, and the toddler's button always converge. Clients send
  commands as single-frame JSON text messages:

  | Command | Effect |
  |---------|--------|
  | `{"cmd":"symbol","id":"sun"}` | project a symbol (`off`, `clock`, `test`, built-in, `custom:<file>`) |
  | `{"cmd":"nightlight","on":true}` | night light on/off |
  | `{"cmd":"nlconfig","r":..,"g":..,"b":..,"brightness":..,"timeoutS":..}` | live color/brightness/timeout while dragging (any subset) |
  | `{"cmd":"lamp","brightness":0-100}` | projector lamp brightness |

- **REST — cold paths**: `GET/POST /api/state`, `GET/POST /api/settings`
  (WiFi, MQTT, mirror, schedule), `POST /api/icons` (PNG upload),
  `DELETE /api/icons?name=`, `POST /api/reboot`.

- **MQTT**: `toddlerclock/...` topics with HA discovery, so in HA it appears
  as a device with a symbol selector + night light — automations like
  *"07:00 → sun icon"* are plain HA automations, no extra code.
