"""Check local registry references and prepare a visual QA contact sheet."""
import json
from pathlib import Path
import re
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
registry = ROOT / 'src/assets/registry.ts'
references = re.findall(r"require\('([^']+)'\)", registry.read_text(encoding='utf-8'))
missing = [ref for ref in references if not (registry.parent / ref).resolve().is_file()]
assert not missing, f'Missing registry assets: {missing}'
records = json.loads((ROOT / 'docs/asset-manifest.json').read_text(encoding='utf-8'))
main = [record for record in records if '-256.' not in record['asset']]
for record in records:
    with Image.open(ROOT / record['asset']) as im:
        assert im.mode == 'RGBA', record['asset']
        assert im.getchannel('A').getextrema() == (0, 255), record['asset']
        assert max(im.size) <= 768

generated = [r for r in main if 'original-' not in r['asset']]
tile_w, tile_h, cols = 240, 270, 5
sheet = Image.new('RGB', (tile_w * cols, tile_h * ((len(generated) + cols - 1) // cols)), '#F4F8FF')
draw = ImageDraw.Draw(sheet)
for index, record in enumerate(generated):
    artwork = Image.open(ROOT / record['asset']).convert('RGBA')
    artwork.thumbnail((216, 230), Image.Resampling.LANCZOS)
    x, y = (index % cols) * tile_w, (index // cols) * tile_h
    sheet.paste(artwork, (x + (tile_w - artwork.width) // 2, y + 8), artwork)
    draw.text((x + 12, y + 248), Path(record['asset']).stem, fill='#233553')
sheet.save(ROOT / 'docs/asset-contact-sheet.webp', quality=88)

print(json.dumps({
    'registryReferences': len(references), 'missing': missing,
    'mainImages': len(main), 'generatedImages': len(generated),
    'mainBytes': sum(r['bytes'] for r in main),
    'allVariantsBytes': sum(r['bytes'] for r in records),
    'maxImageBytes': max(r['bytes'] for r in records),
    'alphaVerified': len(records),
}, indent=2))
