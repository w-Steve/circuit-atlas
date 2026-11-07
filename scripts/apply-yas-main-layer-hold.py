"""Keep the disproven whole-building bank closed through legacy regeneration."""
import copy, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def migrate(data, review):
    result = copy.deepcopy(data)
    assert result['circuitId'] == review['circuitId'] == 'yas-marina'
    main = next(z for z in result['spectatorZones'] if z['zoneId'] == 'main')
    if main not in [review['beforeZone'], review['withdrawnZone']]:
        raise ValueError('Preserve independent Main edits; revalidate seat-layer review')
    result['spectatorZones'] = [copy.deepcopy(review['withdrawnZone']) if z['zoneId'] == 'main' else z for z in result['spectatorZones']]
    result['spectatorZoneIds'] = [z['zoneId'] for z in result['spectatorZones'] if z['availability'] == 'available']
    return result

if __name__ == '__main__':
    path = ROOT / 'src/circuits/generated/yas-marina.json'
    review = json.loads((ROOT / 'src/circuits/season-review/yas-marina-main-layer-review-2026.json').read_text('utf8'))
    result = migrate(json.loads(path.read_text('utf8')), review)
    path.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', 'utf8')
    print('Main layer hold preserved; other Yas regions unchanged.')
