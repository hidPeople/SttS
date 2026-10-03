"""Render the adopted B emblem from vector geometry, preserving its icon composition."""
import argparse
from pathlib import Path

from PIL import Image

import build
from revise import contract_emblem


def export(output: Path, size: int):
    if not output.is_relative_to(build.ROOT) or output.exists():
        raise ValueError('Use a new output file inside the project')
    if not 32 <= size <= 4096:
        raise ValueError('Size must be between 32 and 4096 pixels')
    # Re-rasterize curves at twice the target resolution; never enlarge the tiny PNG.
    build.SCALE = (size * 2 + 31) // 32
    build.BEZIER_STEPS = 192
    art = contract_emblem(bold=True)
    image = Image.alpha_composite(art.image, art.text_layer).resize((size, size), Image.Resampling.LANCZOS)
    assert image.mode == 'RGBA' and image.getchannel('A').getextrema() == (0, 255)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, optimize=True)
    print(f'{output}: {size} x {size}, RGBA, adopted B vector geometry')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='image/ui/Sigil.png')
    parser.add_argument('--size', type=int, default=2048)
    args = parser.parse_args()
    export((build.ROOT / args.output).resolve(), args.size)
