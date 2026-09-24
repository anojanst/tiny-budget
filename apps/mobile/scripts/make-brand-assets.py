#!/usr/bin/env python3
"""
Generates every brand image from one place.

The assets are derived, not drawn — the wordmark, the colours and the Android
safe zone all live here as numbers, so changing the yellow means editing one
line and re-running rather than hunting through a folder of PNGs nobody can
edit. Run it with:

    python3 apps/mobile/scripts/make-brand-assets.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

YELLOW = "#FFCB45"
BLACK = "#1A1A17"
FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
OUT = Path(__file__).resolve().parent.parent / "assets"

# Android masks an adaptive icon to an arbitrary shape and may scale it up:
# only the centre 66% is guaranteed to survive. Everything outside that is
# decoration the launcher is free to crop.
ANDROID_SAFE = 0.66


def fitted(text: str, box_w: int, box_h: int) -> ImageFont.FreeTypeFont:
    """The largest size of FONT that fits `text` inside the box."""
    size = 8
    while size < 2000:
        f = ImageFont.truetype(FONT, size + 4)
        l, t, r, b = f.getbbox(text)
        if r - l > box_w or b - t > box_h:
            break
        size += 4
    return ImageFont.truetype(FONT, size)


def draw_centred(img: Image.Image, text: str, font: ImageFont.FreeTypeFont, fill: str, dy: int = 0):
    """Centres on the glyphs' own ink, not on the font's line box.

    Ascender and descender metrics include room for letters this text does not
    contain, so centring on them leaves a monogram visibly high in its square.
    """
    d = ImageDraw.Draw(img)
    l, t, r, b = d.textbbox((0, 0), text, font=font)
    d.text(((img.width - (r - l)) / 2 - l, (img.height - (b - t)) / 2 - t + dy), text, font=font, fill=fill)


def icon(path: Path, size: int, bg: str | None, text: str, safe: float):
    img = Image.new("RGBA", (size, size), bg if bg else (0, 0, 0, 0))
    draw_centred(img, text, fitted(text, int(size * safe), int(size * safe)), BLACK)
    img.save(path)
    print(f"  {path.name:24} {size}x{size}  {'on ' + bg if bg else 'transparent'}")


OUT.mkdir(exist_ok=True)
print("brand assets:")

# iOS and the web both want the mark and its field baked together.
icon(OUT / "icon.png", 1024, YELLOW, "MA", 0.58)
icon(OUT / "favicon.png", 96, YELLOW, "MA", 0.58)

# Android composes its own: the field is a colour in app.json, and the
# foreground has to survive being masked to a circle.
icon(OUT / "adaptive-icon.png", 1024, None, "MA", ANDROID_SAFE * 0.78)

# The splash is the name in full — there is room for it, and a launch screen
# is the one place the whole wordmark earns its space.
splash = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
draw_centred(splash, "Money Ahead", fitted("Money Ahead", 820, 200), BLACK)
splash.save(OUT / "splash.png")
print(f"  {'splash.png':24} 1024x1024  transparent")
