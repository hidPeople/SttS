from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'image' / 'gallery-thumbnails'
SOURCES = (
    (ROOT / 'image' / 'character', TARGET / 'character'),
    (ROOT / 'image' / 'event', TARGET / 'event'),
    (ROOT / 'image' / 'background', TARGET / 'background'),
)

for source_dir, target_dir in SOURCES:
    target_dir.mkdir(parents=True, exist_ok=True)
    for source in source_dir.glob('*.png'):
        with Image.open(source) as image:
            image.thumbnail((max(1, image.width // 3), max(1, image.height // 3)), Image.Resampling.LANCZOS)
            image.save(target_dir / f'{source.stem}.webp', 'WEBP', quality=65, method=6, alpha_quality=75)
