#!/usr/bin/env python3
"""
Generate the Paintbrush launcher icon as a 1024x1024 PNG.

Deliberately dependency-free: this Mac has no Pillow and no ImageMagick, so
the PNG is encoded by hand with zlib. Only the standard library is used, which
means the icon can be rebuilt on a clean machine with nothing installed.

Output is a macOS-style rounded "squircle" tile with a paintbrush on it.
build_app.sh turns this PNG into the .icns the app bundle uses.
"""

import math
import struct
import sys
import zlib

SIZE = 1024
SS = 2  # supersampling factor per axis, for antialiasing

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------

BG_TOP = (255, 141, 92)      # warm coral
BG_BOTTOM = (190, 62, 124)   # deep magenta
WOOD = (214, 150, 84)
FERRULE = (206, 211, 219)
BRISTLE_BASE = (247, 232, 205)
BRISTLE_TIP = (86, 176, 214)  # the "loaded with paint" end

# Brush axis: handle end (top right) to bristle tip (bottom left).
AX, AY = 726.0, 232.0
BX, BY = 300.0, 784.0
_dx, _dy = BX - AX, BY - AY
LEN = math.hypot(_dx, _dy)
UX, UY = _dx / LEN, _dy / LEN

HANDLE_END = 0.56 * LEN
FERRULE_START = 0.55 * LEN
FERRULE_END = 0.68 * LEN
BRISTLE_START = 0.67 * LEN


def clamp01(x):
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)


def lerp(c0, c1, t):
    return (
        c0[0] + (c1[0] - c0[0]) * t,
        c0[1] + (c1[1] - c0[1]) * t,
        c0[2] + (c1[2] - c0[2]) * t,
    )


def rounded_rect_sdf(px, py, cx, cy, hw, hh, r):
    qx = abs(px - cx) - (hw - r)
    qy = abs(py - cy) - (hh - r)
    outside = math.hypot(max(qx, 0.0), max(qy, 0.0))
    return min(max(qx, qy), 0.0) + outside - r


def brush_sample(px, py):
    """Return (r, g, b, alpha) for the brush at one sample point."""
    dx, dy = px - AX, py - AY
    s = dx * UX + dy * UY
    perp = dx * -UY + dy * UX
    ar = abs(perp)

    # --- bristles -----------------------------------------------------------
    if s >= BRISTLE_START - 2:
        taper_end = LEN + 6
        round_from = taper_end - 58
        if s <= round_from:
            wb = 44 + 18 * clamp01((s - BRISTLE_START) / (round_from - BRISTLE_START))
        else:
            t = clamp01((s - round_from) / (taper_end - round_from))
            wb = 62 * math.sqrt(max(0.0, 1.0 - t * t))
        d = max(ar - wb, BRISTLE_START - s)
        # Once the taper is a sliver, stop drawing entirely — otherwise the
        # ellipse trails a one-pixel hairline past the tip.
        cov = 0.0 if wb < 2.0 else clamp01(0.5 - d)
        if cov > 0:
            t = clamp01((s - BRISTLE_START) / (LEN - BRISTLE_START))
            col = lerp(BRISTLE_BASE, BRISTLE_TIP, t ** 0.8)
            # Faint hair lines so it reads as bristles, not a slab.
            hair = 0.90 + 0.10 * math.cos(perp * 0.42)
            col = (col[0] * hair, col[1] * hair, col[2] * hair)
            return col[0], col[1], col[2], cov

    # --- ferrule (metal band) ----------------------------------------------
    if FERRULE_START - 2 <= s <= FERRULE_END + 2:
        d = max(ar - 46.0, FERRULE_START - s, s - FERRULE_END)
        cov = clamp01(0.5 - d)
        if cov > 0:
            # Cylindrical shading across the band.
            shade = 1.12 - 0.42 * (ar / 46.0) ** 2
            col = tuple(min(255.0, c * shade) for c in FERRULE)
            return col[0], col[1], col[2], cov

    # --- handle -------------------------------------------------------------
    if s <= HANDLE_END + 2:
        wh = 30 + 9 * clamp01(max(s, 0.0) / HANDLE_END)
        if s < 0:
            d = math.hypot(s, ar) - 30
        else:
            d = max(ar - wh, s - HANDLE_END)
        cov = clamp01(0.5 - d)
        if cov > 0:
            shade = 1.15 - 0.45 * (ar / wh) ** 2
            col = tuple(min(255.0, c * shade) for c in WOOD)
            return col[0], col[1], col[2], cov

    return 0.0, 0.0, 0.0, 0.0


def main(out_path):
    buf = bytearray(SIZE * SIZE * 4)

    # Tile geometry: inset squircle, matching modern macOS icon proportions.
    cx = cy = SIZE / 2.0
    hw = hh = SIZE / 2.0 - 96
    radius = 200.0

    inv = 1.0 / (SS * SS)
    off = [(i + 0.5) / SS for i in range(SS)]

    for y in range(SIZE):
        row = y * SIZE * 4
        for x in range(SIZE):
            acc_r = acc_g = acc_b = acc_a = 0.0
            for oy in off:
                py = y + oy
                for ox in off:
                    px = x + ox

                    tile = clamp01(0.5 - rounded_rect_sdf(px, py, cx, cy, hw, hh, radius))
                    if tile <= 0.0:
                        continue

                    t = clamp01((py - (cy - hh)) / (2 * hh))
                    br, bg, bb = lerp(BG_TOP, BG_BOTTOM, t)

                    fr, fg, fb, fa = brush_sample(px, py)
                    if fa > 0.0:
                        br = br + (fr - br) * fa
                        bg = bg + (fg - bg) * fa
                        bb = bb + (fb - bb) * fa

                    acc_r += br * tile
                    acc_g += bg * tile
                    acc_b += bb * tile
                    acc_a += tile

            a = acc_a * inv
            i = row + x * 4
            if a <= 0.0:
                continue
            # Un-premultiply so edge pixels keep their colour.
            buf[i] = int(min(255.0, acc_r / acc_a + 0.5))
            buf[i + 1] = int(min(255.0, acc_g / acc_a + 0.5))
            buf[i + 2] = int(min(255.0, acc_b / acc_a + 0.5))
            buf[i + 3] = int(min(255.0, a * 255 + 0.5))

    write_png(out_path, SIZE, SIZE, buf)


def write_png(path, w, h, rgba):
    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)  # filter type: none
        raw += rgba[y * stride:(y + 1) * stride]

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')

    with open(path, 'wb') as fh:
        fh.write(png)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'paintbrush.png')
