# Enclosure (3D print)

STLs come later — model only after the real parts are in hand and measured.
This documents the intended construction and the constraints that matter.

## Concept

A cylinder/dome sitting on the dresser, projection head on top angled at the
ceiling, diffused night-light ring around the "waist", one big button on the
front top surface, ToF sensor window pointing up.

```
            ▲ to ceiling
        ┌───◠───┐
        │ lens  │            projection head (tilts ±20°)
        │ tube  │
   ┌────┴───────┴────┐
   │  ≋≋ diffuser ≋≋ │  ← WS2812 ring behind translucent ring
   │   [ BUTTON ]    │  ← 60 mm arcade button, front-top
   │  electronics    │
   └─────────────────┘
        USB-C in rear
```

## Optical tube (the part that matters)

Separate printed assembly so it can be iterated without reprinting the body:

1. **LED mount**: star PCB screwed against a small heatsink, condenser lens
   clipped in front. Slots for ±2 mm axial adjustment.
2. **LCD carrier**: holds the bare (backlight-removed) TFT ~5–10 mm in front
   of the condenser. Include a **baffle aperture** that masks everything but
   the active area — the panel's edge leaks much more light than black pixels
   (contrast requirement, see design.md).
3. **Lens holder**: C-mount is a 1"-32 TPI thread — printable at 0.12 mm
   layers, but a printed *slip-fit sleeve with a grub screw* (or an M3
   friction slot) is more reliable for focusing than printed threads.
   LCD-to-lens distance ≈ the lens's flange focal distance (~17.5 mm for
   C-mount); make the sleeve give ±4 mm travel.
4. Everything inside the tube: **matte black** (black PLA minimum, matte
   black paint better). Add a 10–15 mm hood past the lens against stray spill.

Start with a bench "optics sled": a flat printed rail holding LED, condenser,
LCD, and lens at adjustable spacings. Find the sweet spot, then transfer the
measured distances into the final tube.

## Body

- Two-piece shell (base + top) with heat-set inserts; ring diffuser printed
  in white/natural PETG at 2 perimeters, 0% infill "vase-ish" for glow.
- Button needs ~55 mm panel hole + depth for its microswitch body.
- ToF sensor behind a small open window (bare hole or very thin clear cover;
  thick covers degrade VL53L0X readings).
- Ventilation slots above the LED heatsink (chimney effect), light-baffled so
  no lamp light leaks into the room.
- Cable strain relief on the USB-C entry; rubber feet so a toddler can't
  easily slide it off the dresser.

## Safety notes (toddler product)

- No small detachable parts; button ring screwed from inside.
- LED and heatsink not touchable through any opening.
- If the battery option is built in: 18650 fully enclosed, screwed hatch.
- Keep the device out of throwing range of the bed regardless — it's glass
  (lens, LCD) inside plastic.
