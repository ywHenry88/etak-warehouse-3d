"""Compress CC0 PBR images into the standalone site's offline texture bundle."""
from PIL import Image, ImageOps, ImageEnhance
from pathlib import Path
import base64, io, json
root = Path('assets/ultra')
bundle = {}
for kind in ['concrete', 'wall', 'wood']:
    bundle[kind] = {}
    for name in ['map', 'normalMap', 'roughnessMap']:
        image = Image.open(root / 'source' / f'{kind}-{name}.jpg').convert('RGB')
        size = 1024 if kind == 'concrete' or (name == 'map' and kind != 'metal') else 512
        image = image.resize((size, size), Image.Resampling.LANCZOS)
        if name == 'map' and kind in ['metal', 'wall']:
            # Preserve source detail while allowing equipment/wall paint to tint it.
            image = ImageOps.grayscale(image)
            image = ImageOps.autocontrast(image, cutoff=1)
            low, high = (167, 249) if kind == 'metal' else (204, 250)
            image = image.point(lambda v: int(low + v / 255 * (high - low))).convert('RGB')
        if name == 'map' and kind == 'concrete':
            image = ImageEnhance.Color(image).enhance(.12)
            # A maintained sealed warehouse slab, with restrained aggregate contrast.
            image = ImageEnhance.Contrast(image).enhance(.48)
            image = ImageEnhance.Brightness(image).enhance(1.16)
        output = io.BytesIO()
        image.save(output, format='WEBP', quality=88 if name == 'normalMap' else 83, method=6)
        bundle[kind][name] = 'data:image/webp;base64,' + base64.b64encode(output.getvalue()).decode('ascii')
(root / 'textures.json').write_text(json.dumps(bundle, separators=(',', ':')) + '\n')
print(f'Packed photographic PBR maps: {(root / "textures.json").stat().st_size / 1024:.0f} KiB')
