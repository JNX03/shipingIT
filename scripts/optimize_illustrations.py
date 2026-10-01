"""Deterministic size/encoding optimization; generated artwork is not redrawn."""
from hashlib import sha256
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GROUPS = ['characters/mentor', 'illustrations', 'rewards']


def main() -> None:
    records = []
    for group in GROUPS:
        folder = ROOT / 'art/source' / group
        output_folder = ROOT / 'assets' / group
        output_folder.mkdir(parents=True, exist_ok=True)
        for source in sorted(folder.glob('*.png')):
            image = Image.open(source).convert('RGBA')
            original_size = image.size
            original_bytes = source.stat().st_size
            original_hash = sha256(source.read_bytes()).hexdigest()
            if image.getchannel('A').getextrema() != (0, 255):
                raise ValueError(f'Expected real transparent alpha: {source}')
            for edge, suffix in [(768, ''), (256, '-256')]:
                optimized = image.copy()
                optimized.thumbnail((edge, edge), Image.Resampling.LANCZOS)
                destination = output_folder / (source.stem + suffix + '.webp')
                # Metro may read assets while this task runs; never expose a partial image.
                temporary = destination.with_suffix('.webp.tmp')
                optimized.save(temporary, 'WEBP', quality=88, method=6, exact=True)
                temporary.replace(destination)
                with Image.open(destination) as verified:
                    assert verified.getchannel('A').getextrema() == (0, 255)
                    records.append({
                        'asset': destination.relative_to(ROOT).as_posix(),
                        'size': list(verified.size),
                        'bytes': destination.stat().st_size,
                        'alpha': True,
                        'sha256': sha256(destination.read_bytes()).hexdigest(),
                        'sourceSize': list(original_size),
                        'sourceBytes': original_bytes,
                        'sourceSha256': original_hash,
                    })
    out = ROOT / 'docs/asset-manifest.json'
    out.write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'files': len(records), 'bytes': sum(r['bytes'] for r in records), 'manifest': str(out)}))


if __name__ == '__main__':
    main()
