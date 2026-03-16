#!/usr/bin/env python3
"""
Generate Android launcher icon PNGs from the vector foreground definition.
Renders the two-card + checkmark design on #F7F8FC background at all mipmap densities.
Also generates round (circle-masked) variants.
"""

import math
from PIL import Image, ImageDraw

# ── Foreground definition (from ic_launcher_foreground.xml, 108dp viewport) ──

BG_COLOR = (0xF7, 0xF8, 0xFC, 255)  # #F7F8FC
CARD_COLOR = (0x6C, 0x63, 0xFF, 255)  # #6C63FF
CARD_COLOR_ALPHA = (0x6C, 0x63, 0xFF, int(0.35 * 255))  # #6C63FF @ 35%
CHECK_COLOR = (255, 255, 255, 255)

# Viewport is 108x108, visible area is center 72x72 (offset 18 on each side)
VIEWPORT = 108.0

# Bottom card (rotated +6° around pivot 61.71, 59.14)
# Rounded rect: x=38.57, y=30.86, w=46.29, h=56.57, rx=7.71
BOTTOM_CARD = {
    'x': 38.57, 'y': 30.86, 'w': 46.29, 'h': 56.57, 'rx': 7.71,
    'rotation': 6, 'pivot': (61.71, 59.14),
    'color': CARD_COLOR_ALPHA
}

# Top card (rotated -6° around pivot 46.29, 48.86)
# Rounded rect: x=23.14, y=20.57, w=46.29, h=56.57, rx=7.71
TOP_CARD = {
    'x': 23.14, 'y': 20.57, 'w': 46.29, 'h': 56.57, 'rx': 7.71,
    'rotation': -6, 'pivot': (46.29, 48.86),
    'color': CARD_COLOR
}

# Checkmark (rotated with top card: -6° around 46.29, 48.86)
# Polyline: (36, 51.43) -> (43.71, 59.14) -> (56.57, 43.71)
CHECKMARK = {
    'points': [(36, 51.43), (43.71, 59.14), (56.57, 43.71)],
    'width_dp': 4.5,
    'rotation': -6, 'pivot': (46.29, 48.86),
    'color': CHECK_COLOR
}

# Density -> icon size (dp) for launcher icons
DENSITIES = {
    'mdpi':    48,
    'hdpi':    72,
    'xhdpi':   96,
    'xxhdpi':  144,
    'xxxhdpi': 192,
}

# We render at a higher resolution and then downscale for antialiasing
SUPERSAMPLE = 4

# Scale factor for the icon content within the visible area (< 1.0 = smaller, leaves padding)
ICON_SCALE = 0.85


def rotate_point(x, y, angle_deg, px, py):
    """Rotate point (x,y) around pivot (px,py) by angle_deg degrees."""
    rad = math.radians(angle_deg)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)
    dx = x - px
    dy = y - py
    nx = cos_a * dx - sin_a * dy + px
    ny = sin_a * dx + cos_a * dy + py
    return nx, ny


def rounded_rect_polygon(x, y, w, h, rx, steps=16):
    """Generate polygon points for a rounded rectangle."""
    points = []
    # Top-right corner
    cx, cy = x + w - rx, y + rx
    for i in range(steps + 1):
        angle = -math.pi / 2 + (math.pi / 2) * i / steps
        points.append((cx + rx * math.cos(angle), cy + rx * math.sin(angle)))
    # Bottom-right corner
    cx, cy = x + w - rx, y + h - rx
    for i in range(steps + 1):
        angle = 0 + (math.pi / 2) * i / steps
        points.append((cx + rx * math.cos(angle), cy + rx * math.sin(angle)))
    # Bottom-left corner
    cx, cy = x + rx, y + h - rx
    for i in range(steps + 1):
        angle = math.pi / 2 + (math.pi / 2) * i / steps
        points.append((cx + rx * math.cos(angle), cy + rx * math.sin(angle)))
    # Top-left corner
    cx, cy = x + rx, y + rx
    for i in range(steps + 1):
        angle = math.pi + (math.pi / 2) * i / steps
        points.append((cx + rx * math.cos(angle), cy + rx * math.sin(angle)))
    return points


def scale_point_from_center(x, y, s, cx=54.0, cy=54.0):
    """Scale a point relative to the viewport center (54, 54)."""
    return cx + (x - cx) * s, cy + (y - cy) * s


def draw_rotated_rounded_rect(draw, card, scale, ss):
    """Draw a rotated rounded rectangle."""
    # Apply ICON_SCALE: shrink card dimensions and position toward center
    sx, sy = scale_point_from_center(card['x'], card['y'], ICON_SCALE)
    sw, sh = card['w'] * ICON_SCALE, card['h'] * ICON_SCALE
    srx = card['rx'] * ICON_SCALE
    spx, spy = scale_point_from_center(card['pivot'][0], card['pivot'][1], ICON_SCALE)

    poly = rounded_rect_polygon(sx, sy, sw, sh, srx)
    # Rotate each point
    rotated = [rotate_point(px, py, card['rotation'], spx, spy) for px, py in poly]
    # Scale to pixel coordinates
    scaled = [(px * scale * ss, py * scale * ss) for px, py in rotated]
    draw.polygon(scaled, fill=card['color'])


def draw_rotated_polyline(draw, check, scale, ss):
    """Draw a rotated polyline (checkmark)."""
    # Apply ICON_SCALE to points and pivot
    points = [scale_point_from_center(px, py, ICON_SCALE) for px, py in check['points']]
    spx, spy = scale_point_from_center(check['pivot'][0], check['pivot'][1], ICON_SCALE)

    rotated = [rotate_point(px, py, check['rotation'], spx, spy) for px, py in points]
    scaled = [(px * scale * ss, py * scale * ss) for px, py in rotated]
    line_width = max(1, round(check['width_dp'] * ICON_SCALE * scale * ss))
    draw.line(scaled, fill=check['color'], width=line_width, joint='curve')
    # Draw round caps at endpoints
    r = line_width / 2
    for pt in [scaled[0], scaled[-1]]:
        draw.ellipse([pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r], fill=check['color'])


def render_icon(size, supersampled=True):
    """Render the icon at a given pixel size. Returns an RGBA Image."""
    ss = SUPERSAMPLE if supersampled else 1
    render_size = size * ss
    scale = render_size / VIEWPORT  # This maps 108dp -> render_size pixels
    # But we want the visible 72dp area to fill the icon, so:
    # visible area = center 72dp of 108dp viewport
    # We render the full 108dp viewport, then crop the center 72dp
    full_size = int(VIEWPORT * scale)

    img = Image.new('RGBA', (full_size, full_size), BG_COLOR)
    draw = ImageDraw.Draw(img, 'RGBA')

    # Draw bottom card (semi-transparent)
    draw_rotated_rounded_rect(draw, BOTTOM_CARD, scale / ss, ss)
    # Draw top card (opaque)
    draw_rotated_rounded_rect(draw, TOP_CARD, scale / ss, ss)
    # Draw checkmark
    draw_rotated_polyline(draw, CHECKMARK, scale / ss, ss)

    # Crop to the center 72dp visible area
    visible_dp = 72.0
    offset_dp = (VIEWPORT - visible_dp) / 2  # = 18dp
    offset_px = int(offset_dp * scale)
    visible_px = int(visible_dp * scale)
    img = img.crop((offset_px, offset_px, offset_px + visible_px, offset_px + visible_px))

    # Downscale from supersampled size to target size
    if supersampled:
        img = img.resize((size, size), Image.LANCZOS)

    return img


def make_round(img):
    """Apply a circular mask to make a round icon."""
    size = img.size[0]
    mask = Image.new('L', (size * SUPERSAMPLE, size * SUPERSAMPLE), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse([0, 0, size * SUPERSAMPLE - 1, size * SUPERSAMPLE - 1], fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)

    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    result.paste(img, mask=mask)
    return result


def main():
    import os

    base_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        '..', 'android', 'app', 'src', 'main', 'res'
    )

    for density, size in DENSITIES.items():
        mipmap_dir = os.path.join(base_dir, f'mipmap-{density}')
        os.makedirs(mipmap_dir, exist_ok=True)

        # Generate square icon
        icon = render_icon(size)
        icon_path = os.path.join(mipmap_dir, 'ic_launcher.png')
        icon.save(icon_path, 'PNG')
        print(f'  ✅ {icon_path} ({size}x{size})')

        # Generate round icon
        round_icon = make_round(icon)
        round_path = os.path.join(mipmap_dir, 'ic_launcher_round.png')
        round_icon.save(round_path, 'PNG')
        print(f'  ✅ {round_path} ({size}x{size})')

    print('\nDone! All icons generated.')


if __name__ == '__main__':
    main()
