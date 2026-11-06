"""Import the supplied Markdown without dropping card text or embedded illustrations.

Usage: python scripts/import-monsterbook.py 'Монстробук с картинками финал.md'
"""
import base64
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

def import_book(source: Path) -> None:
    text = source.read_text(encoding='utf-8')
    images = {}
    assets = ROOT / 'content/assets/monsters'
    assets.mkdir(parents=True, exist_ok=True)
    pattern = r'^\[(image\d+)\]:\s*<data:image/(png|jpeg|gif|webp);base64,([^>]+)>\s*$'
    for match in re.finditer(pattern, text, re.M):
        key, kind, encoded = match.groups()
        filename = f'{key}.{kind}'
        (assets / filename).write_bytes(base64.b64decode(encoded, validate=True))
        images[key] = filename
    body = re.sub(pattern, '', text, flags=re.M)
    cards = re.split(r'(?m)(?=^\| Название \|)', body)[1:]
    if not cards or not images:
        raise ValueError('Не найдены карточки или встроенные изображения')
    manifest = []
    for i, card in enumerate(cards, 1):
        original_hash = hashlib.sha256(card.strip().encode('utf-8')).hexdigest()
        name = card.splitlines()[0].split('|')[2].strip()
        slug = f'monster-{i:02d}'
        referenced = re.findall(r'!\[\]\[(image\d+)\]', card)
        for key in referenced:
            if key not in images:
                raise ValueError(f'{name}: отсутствует {key}')
            card = card.replace(f'![][{key}]', f'![{name}](data/assets/monsters/{images[key]})')
        if slug == 'monster-09':
            image = f'![{name}](data/assets/monsters/{images[referenced[0]]})'
            card = card.replace(image, '')
            profile, rest = card.split('\n\n', 1)
            rows = profile.splitlines()
            rows = [row + (' ' + image + ' |' if index == 0 else ' :---: |' if index == 1 else '  |')
                    for index, row in enumerate(rows)]
            card = '\n'.join(rows) + '\n\n' + rest
        # Add navigable headings outside the original tables, leaving all source rows intact.
        card = '## Описание, атака и удержание {#profile}\n\n' + card
        card = re.sub(r'(?m)(?=^\| (?:\*\*)?УЯЗВИМОСТИ)',
                      '## Уязвимости и взаимодействие с магией {#vulnerabilities}\n\n', card, count=1)
        header = f'---\nid: {slug}\ntitle: {json.dumps(name, ensure_ascii=False)}\nsection: Монстробук\norder: {i}\n---\n\n'
        intro = 'Сокращения уровней в таблицах: С — Симпла, М — Максима, У — Ультима.\n\n'
        (ROOT / f'content/rules/{slug}.md').write_text(header + intro + card.strip() + '\n')
        manifest.append({'id': slug, 'title': name, 'images': [images[k] for k in referenced],
                         'markdownSha256': original_hash})
    used = {filename for card in manifest for filename in card['images']}
    if used != set(images.values()):
        raise ValueError('Есть изображения, не привязанные к карточкам')
    (ROOT / 'content/monsterbook.json').write_text(json.dumps({
        'source': source.name, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'cards': manifest,
    }, ensure_ascii=False, indent=2) + '\n')
    print(f'Импортировано карточек: {len(cards)}, изображений: {len(images)}')

if __name__ == '__main__':
    import_book(Path(sys.argv[1]))
