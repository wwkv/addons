#!/usr/bin/env python3
"""Prepare a custom icon for the toddler clock.

Takes any image, fits it into 240x240 on a pure black background (black
projects as 'nothing', see docs/design.md#contrast), and writes a PNG ready
to upload via the web app.

Usage:  python3 prepare_icon.py input.jpg [output.png]
Needs:  pip install pillow
"""

import sys
from pathlib import Path

from PIL import Image

SIZE = 240


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_suffix(".png")

    img = Image.open(src).convert("RGBA")
    img.thumbnail((SIZE, SIZE), Image.LANCZOS)

    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 255))
    canvas.paste(img, ((SIZE - img.width) // 2, (SIZE - img.height) // 2), img)

    canvas.convert("RGB").save(dst, "PNG", optimize=True)
    print(f"wrote {dst} ({SIZE}x{SIZE}, black background)")


if __name__ == "__main__":
    main()
