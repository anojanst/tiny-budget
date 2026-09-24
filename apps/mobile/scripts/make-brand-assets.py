#!/usr/bin/env python3
"""
Generates every brand image from one place.

The assets are derived, not drawn — the wordmark, the colours and the Android
safe zone all live here as numbers, so changing the yellow means editing one
line and re-running rather than hunting through a folder of PNGs nobody can
edit. Run it with:

    python3 apps/mobile/scripts/make-brand-assets.py
"""
import math
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

# The splash continues the icon: the same mark, then the name under it.
#
# Android 12 and later hand the drawable to the system splash, which masks it
# to a circle of roughly two thirds the canvas — anything outside is simply
# not drawn. The first version of this was the wordmark alone at full width
# and would have been cut through the middle of it. So the lockup is built at
# its natural size and then scaled to fit *inside* that circle, which is what
# the diagonal check below is doing: a box fits a circle when its diagonal
# does, not when its width does.
def splash(path: Path, size: int = 1024):
    mark = ImageFont.truetype(FONT, 300)
    name = ImageFont.truetype(FONT, 76)
    gap = 54

    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    lines = []
    for text, f in (("MA", mark), ("Money Ahead", name)):
        l, t, r, b = probe.textbbox((0, 0), text, font=f)
        lines.append((text, f, l, t, r - l, b - t))
    w = max(line[4] for line in lines)
    h = sum(line[5] for line in lines) + gap

    lockup = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(lockup)
    y = 0
    for text, f, l, t, tw, th in lines:
        d.text(((w - tw) / 2 - l, y - t), text, font=f, fill=BLACK)
        y += th + gap

    safe = size * ANDROID_SAFE
    scale = min(1.0, safe / math.hypot(w, h))
    lockup = lockup.resize((round(w * scale), round(h * scale)), Image.LANCZOS)

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.alpha_composite(lockup, ((size - lockup.width) // 2, (size - lockup.height) // 2))
    img.save(path)
    print(f"  {path.name:24} {size}x{size}  lockup {lockup.size}, inside the mask")


splash(OUT / "splash.png")
