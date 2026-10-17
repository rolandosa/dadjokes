"""Remove the baked-in checkerboard from the Dad photos and export web-ready WebPs.

    python3 scripts/cutout.py <rest.jpg> <talk.jpg> <grin.jpg> <blink.jpg>

The background is keyed out as the neutral, light region connected to the image border,
so light parts of Dad (the blue shirt, eye whites) are kept.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

NAMES = ['dad-rest', 'dad-talk', 'dad-grin', 'dad-blink']
WIDTH = 600


def cutout(path):
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    light = rgb.min(axis=2)
    bg_like = (spread < 22) & (light > 165)
    labels, _ = ndimage.label(bg_like)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, border[border > 0])
    # Fill pinholes in Dad, pull the edge in past the JPEG fringe, then soften it.
    fg = ndimage.binary_fill_holes(~bg)
    fg = ndimage.binary_opening(fg, iterations=2)
    fg = ndimage.binary_erosion(fg, iterations=2)
    # Keep only the largest blob (drops stray smudges in the background).
    lab, n = ndimage.label(fg)
    if n > 1:
        sizes = ndimage.sum(fg, lab, range(1, n + 1))
        fg = lab == (1 + int(np.argmax(sizes)))
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))
    im = Image.open(path).convert('RGB')
    im.putalpha(alpha)
    return im


for name, path in zip(NAMES, sys.argv[1:5]):
    im = cutout(path)
    h = round(im.height * WIDTH / im.width)
    im = im.resize((WIDTH, h), Image.LANCZOS)
    out = f'client/assets/{name}.webp'
    im.save(out, 'WEBP', quality=86, method=6)
    print(out, im.size)
