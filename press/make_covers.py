#!/usr/bin/env python3
"""Compose press/out/cover-titled.png and cover-plain.png from a Godot
capture. itch's cover requirement is exactly 630x500 — see press/README.md.

Usage: python3 press/make_covers.py [--b-colour red|teal] [--lift GAMMA]

BRIGHTNESS. The source plate is room 2 unmedicated, which is the darkest the
ward ever gets — mean luminance about 9/255. That is correct for the game and
poor for a 630x500 store thumbnail seen at a glance, where the author reported
"you can't really see what's in it". --lift applies a GAMMA curve to the frame
before the type goes on: v' = (v/255) ** (1/gamma).

Gamma, not a multiply, and not the game's own brightness setting:
  * a multiply scales everything, so the ceiling panel clips to white long
    before the walls come up out of black;
  * gamma lifts the shadows and leaves the highlights nearly where they are,
    which is the same reasoning the posterise shader's shadow_gamma uniform is
    built on — this ward's signal lives in the bottom of the range;
  * recapturing at a higher in-game brightness would change what the frame
    CLAIMS the game looks like. A cover treatment is honest about being a
    treatment; a gameplay frame shot at an atypical setting is not.

The type is unaffected: the lift is applied to the plate only, and the bottom
gradient that keeps the title legible is composited after it.

THE "B" COLOUR IS AN OPEN QUESTION, hence the flag. The previous cover set the
B in red and press/README.md describes the treatment that way, but the GAME's
own start screen (ui/start_overlay.tscn) sets "WARD " in off-white and "B" in
the teal accent — there is no red B anywhere in the shipping build. Red echoes
the wall graffiti and reads harder on a store thumbnail; teal is what a player
sees three seconds later. Defaults to red for continuity with the existing
store page; pass --b-colour teal to match the game.

Source frame: press/raw/hero-r2.png — the room2 corridor clean plate (HUD
hidden, unmed/dark), the same shot that leads press/README.md's recommended
order. Matches the OLD cover's choice of frame (room2 corridor) and design
language (the game's own type, teal accent, red B) — see the design doc at
docs/superpowers/specs/2026-07-26-itch-page-metadata.md section 7.

Colors:
  red   (255, 59, 48)   sampled from the previous cover-titled.png's "B"
  teal  (0.624, 0.847, 0.796) -> (159, 216, 203) — the game's own accent,
        used for "ADMIT ME" / highlighted labels in ui/start_overlay.tscn
        and for the subtitle line here.
  off-white (0.914, 0.949, 0.937) -> (233, 242, 239) — the game's "WARD "
        label color in ui/start_overlay.tscn.

Font: godot/fonts/SpecialElite-Regular.ttf — the game's own institutional/
typewriter face (the closest thing to "mono" in godot/fonts/; the game
itself has no dedicated title font, see press/README.md's Fonts note).
"""
import argparse
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, "raw", "hero-r2.png")
OUT_DIR = os.path.join(ROOT, "out")
FONT_TITLE = os.path.join(ROOT, "..", "godot", "fonts", "SpecialElite-Regular.ttf")

COVER_W, COVER_H = 630, 500

WHITE = (233, 242, 239)
TEAL = (159, 216, 203)
RED = (255, 59, 48)
DIM = (166, 176, 173)

B_COLOUR = RED
OUT_TITLED = "cover-titled.png"
LIFT = 1.0


def crop_to_cover(im: Image.Image) -> Image.Image:
    """Center-crop to the 630:500 aspect, then resize to exactly 630x500."""
    target_ratio = COVER_W / COVER_H
    w, h = im.size
    src_ratio = w / h
    if src_ratio > target_ratio:
        # source is wider than target — crop width
        new_w = int(h * target_ratio)
        x0 = (w - new_w) // 2
        im = im.crop((x0, 0, x0 + new_w, h))
    else:
        new_h = int(w / target_ratio)
        y0 = (h - new_h) // 2
        im = im.crop((0, y0, w, y0 + new_h))
    return im.resize((COVER_W, COVER_H), Image.LANCZOS)


def lift_shadows(im: Image.Image, gamma: float) -> Image.Image:
    """Gamma-lift the frame. gamma 1.0 is a byte-exact passthrough."""
    if abs(gamma - 1.0) < 1e-6:
        return im
    inv = 1.0 / gamma
    lut = [min(255, int(round(255.0 * ((i / 255.0) ** inv)))) for i in range(256)]
    return im.point(lut * 3)


def tracked_text_size(draw, text, font, tracking):
    total = 0
    height = 0
    for ch in text:
        bbox = font.getbbox(ch)
        total += (bbox[2] - bbox[0]) + tracking
        height = max(height, bbox[3] - bbox[1])
    return total - tracking, height


def draw_tracked(draw, xy, text, font, fill, tracking, anchor_center_x=None):
    x, y = xy
    if anchor_center_x is not None:
        w, _ = tracked_text_size(draw, text, font, tracking)
        x = anchor_center_x - w / 2
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        bbox = font.getbbox(ch)
        x += (bbox[2] - bbox[0]) + tracking
    return x


def bottom_gradient(im: Image.Image, strength=0.75, start_frac=0.45) -> Image.Image:
    """Darken the lower portion so type stays legible over a bright frame,
    same job the old cover's bottom gradient did — see press/out/cover-titled
    .png (pre-Godot version) for the effect being matched."""
    w, h = im.size
    grad = Image.new("L", (1, h), 0)
    start = int(h * start_frac)
    for y in range(h):
        if y < start:
            a = 0
        else:
            a = int(255 * strength * (y - start) / (h - start))
        grad.putpixel((0, y), a)
    grad = grad.resize((w, h))
    black = Image.new("RGB", (w, h), (2, 4, 4))
    return Image.composite(black, im, grad)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    base = Image.open(RAW).convert("RGB")
    cover = lift_shadows(crop_to_cover(base), LIFT)

    # --- cover-plain.png -----------------------------------------------
    plain = cover.copy()
    plain.save(os.path.join(OUT_DIR, "cover-plain.png"))

    # --- cover-titled.png ------------------------------------------------
    titled = bottom_gradient(cover, strength=0.80, start_frac=0.42)
    draw = ImageDraw.Draw(titled)

    title_font = ImageFont.truetype(FONT_TITLE, 58)
    sub_font = ImageFont.truetype(FONT_TITLE, 15)
    tag_font = ImageFont.truetype(FONT_TITLE, 12)

    cx = COVER_W / 2
    title_y = 350
    tracking_title = 6

    ward_w, _ = tracked_text_size(draw, "WARD ", title_font, tracking_title)
    b_w, _ = tracked_text_size(draw, "B", title_font, tracking_title)
    total_w = ward_w + b_w
    start_x = cx - total_w / 2

    # subtle drop shadow for legibility, then the real glyphs
    for dx, dy, col in [(0, 3, (0, 0, 0))]:
        draw_tracked(draw, (start_x + dx, title_y + dy), "WARD ", title_font, col, tracking_title)
        draw_tracked(draw, (start_x + ward_w + dx, title_y + dy), "B", title_font, col, tracking_title)

    draw_tracked(draw, (start_x, title_y), "WARD ", title_font, WHITE, tracking_title)
    draw_tracked(draw, (start_x + ward_w, title_y), "B", title_font, B_COLOUR, tracking_title)

    draw_tracked(draw, (0, 424), "TWO REALITIES  ·  ONE PILL", sub_font, TEAL,
                 tracking=4, anchor_center_x=cx)
    draw_tracked(draw, (0, 458), "GREYBOX PROTOTYPE — v0.2", tag_font, DIM,
                 tracking=3, anchor_center_x=cx)

    titled.save(os.path.join(OUT_DIR, OUT_TITLED))
    print("wrote cover-plain.png and %s" % OUT_TITLED)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--b-colour", choices=["red", "teal"], default="red",
                    help="colour of the title's B — see the module docstring")
    ap.add_argument("--out", default=None, help="override the titled filename")
    ap.add_argument("--lift", type=float, default=1.0,
                    help="shadow-lift gamma for the frame; 1.0 = untouched")
    ap.add_argument("--plate", default=None,
                    help="source frame under press/raw/; defaults to hero-r2.png")
    a = ap.parse_args()
    B_COLOUR = RED if a.b_colour == "red" else TEAL
    OUT_TITLED = a.out or "cover-titled.png"
    LIFT = a.lift
    if a.plate:
        RAW = os.path.join(ROOT, "raw", a.plate)
    main()
