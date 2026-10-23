"""Rebuild the offline atlas from the pinned F1DB v2026.17.0 extracts.

Input files are retained in artifacts/atlas-source; no network at build/runtime.
2026 schedule and model links use the project's separately verified F1 snapshot.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'artifacts/atlas-source'
OUT = ROOT / 'src/atlas'
OUT.mkdir(exist_ok=True)
def read(path):
    return json.loads(path.read_text(encoding='utf-8'))
def write(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')

circuits = read(SOURCE / 'f1db-circuits.json')
races = read(SOURCE / 'f1db-races.json')
countries = {c['id']: c['name'] for c in read(SOURCE / 'f1db-countries.json')}
country_zh = {'australia':'澳大利亚','japan':'日本','morocco':'摩洛哥','united-kingdom':'英国','sweden':'瑞典','germany':'德国','bahrain':'巴林','switzerland':'瑞士','india':'印度','argentina':'阿根廷','france':'法国','united-states-of-america':'美国','united-states':'美国','south-africa':'南非','portugal':'葡萄牙','san-marino':'圣马力诺','turkey':'土耳其','spain':'西班牙','saudi-arabia':'沙特阿拉伯','canada':'加拿大','italy':'意大利','belgium':'比利时','russia':'俄罗斯','south-korea':'韩国','austria':'奥地利'}
gps = {g['id']: g['fullName'] for g in read(SOURCE / 'f1db-grands-prix.json')}
models = read(ROOT / 'src/circuits/generated/summaries.json')
dates = read(ROOT / 'src/circuits/season2026.json')
aliases = {'barcelona': 'catalunya', 'madrid': 'madring', 'singapore': 'marina-bay', 'spa': 'spa-francorchamps', 'mexico': 'mexico-city'}
model_by_id = {aliases.get(c['circuitId'], c['circuitId']): c for c in models}
names = read(OUT / 'names-zh.json')
assert len(model_by_id) == 23
# Include championship rounds (including 1950–1960 Indianapolis 500), not sprints.
# The pinned source's completed round is Singapore, 2026-10-11.
held = [r for r in races if r['date'] <= '2026-10-11']
archive = [r for r in held if r['year'] < 2026]
calendar = {}
for r in archive:
    calendar.setdefault(str(r['year']), []).append({
        'venueId': r['circuitId'], 'round': r['round'], 'date': r['date'],
        'name': gps[r['grandPrixId']], 'layoutId': r['circuitLayoutId'],
        'lengthMetres': round(r['courseLength'] * 1000), 'corners': r['turns'],
    })
for year in calendar:
    calendar[year].sort(key=lambda r: r['round'])
calendar['2026'] = [{
    'venueId': aliases.get(c['circuitId'], c['circuitId']), 'round': c['round'],
    'date': dates[c['circuitId']]['end'], 'start': dates[c['circuitId']]['start'],
    'name': c['grandPrix'], 'lengthMetres': c['lengthMetres'], 'corners': c['cornerCount'],
} for c in sorted(models, key=lambda c: c['round'])]
venues = []
for c in circuits:
    history = [r for r in held if r['circuitId'] == c['id']]
    if not history:  # Never classify a future-only proposal as a past host.
        continue
    model = model_by_id.get(c['id'])
    years = sorted({r['year'] for r in history})
    venues.append({
        'id': c['id'], 'name': model['name'] if model else names[c['id']],
        'locality': model['location'] if model else c['placeName'],
        'country': model['country'] if model else country_zh.get(c['countryId'], countries[c['countryId']]),
        'aliases': [c['name'], c['fullName'], c['placeName'], c['countryId'], countries[c['countryId']]] + (c['previousNames'] or []) + (['纽北', 'Nordschleife'] if c['id']=='nurburgring' else []),
        'coordinate': [c['longitude'], c['latitude']],
        'years': years, 'raceCount': len(history),
        'modelId': model['circuitId'] if model else None,
        'currentSeason': bool(model),
    })
assert len(venues) == 78 and len(archive) == 1149
assert set(calendar) == {str(y) for y in range(1950, 2027)}
ids = {v['id'] for v in venues}
assert all(r['venueId'] in ids for rows in calendar.values() for r in rows)
write('venues.json', venues)
write('calendars.json', calendar)
write('provenance.json', {
    'checkedOn': '2026-10-23', 'heldThrough': '2026-10-11',
    'release': 'v2026.17.0', 'source': 'https://github.com/f1db/f1db/releases/tag/v2026.17.0',
    'archiveSha256': '0f1717eaebae646b7ced9ca96f6be3282c1c1d435d0a9d75f2c00f40feb7d2a8',
    'license': 'CC BY 4.0', 'authors': 'F1DB contributors',
    'files': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(SOURCE.glob('*.json'))},
})
print(f'{len(venues)} venues / {len(archive)} historical races / {len(calendar)} seasons')
