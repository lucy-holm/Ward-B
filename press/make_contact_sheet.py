#!/usr/bin/env python3
"""Build press/out/contact-sheet.png — every press/raw/*.png at a glance.

Usage: python3 press/make_contact_sheet.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(ROOT, "raw")
OUT = os.path.join(ROOT, "out", "contact-sheet.png")
FONT = os.path.join(ROOT, "..", "godot", "fonts", "SpecialElite-Regular.ttf")

THUMB_W = 380
COLS = 4
PAD = 10
LABEL_H = 22
BG = (8, 10, 10)
LABEL_COLOR = (200, 210, 207)


def main():
    files = sorted(f for f in os.listdir(RAW_DIR) if f.endswith(".png"))
    thumbs = []
    for f in files:
        im = Image.open(os.path.join(RAW_DIR, f)).convert("RGB")
        w, h = im.size
        thumb_h = int(THUMB_W * h / w)
        thumbs.append((f, im.resize((THUMB_W, thumb_h), Image.LANCZOS)))

    cell_h = thumbs[0][1].size[1] + LABEL_H
    rows = (len(thumbs) + COLS - 1) // COLS
    sheet_w = COLS * THUMB_W + (COLS + 1) * PAD
    sheet_h = rows * cell_h + (rows + 1) * PAD + 40

    sheet = Image.new("RGB", (sheet_w, sheet_h), BG)
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.truetype(FONT, 18)
    label_font = ImageFont.truetype(FONT, 13)

    draw.text((PAD, 10), "WARD B — press contact sheet (Godot build)", font=title_font, fill=(233, 242, 239))

    for i, (name, thumb) in enumerate(thumbs):
        col = i % COLS
        row = i // COLS
        x = PAD + col * (THUMB_W + PAD)
        y = 40 + PAD + row * (cell_h + PAD)
        sheet.paste(thumb, (x, y))
        draw.text((x, y + thumb.size[1] + 4), name, font=label_font, fill=LABEL_COLOR)

    sheet.save(OUT)
    print("wrote %s (%dx%d, %d shots)" % (OUT, sheet_w, sheet_h, len(thumbs)))


if __name__ == "__main__":
    main()
