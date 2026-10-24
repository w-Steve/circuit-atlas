"""Build factual venue profiles and retain a licensed, versioned layout per venue.

Run from the repository root. Downloads only missing assets; verifies Git blob
hashes against the retained v2026.17.0 manifest, never trusts branch-tip geometry.
"""
import concurrent.futures, hashlib, json, urllib.request, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
def read(path):
    return json.loads((ROOT/path).read_text(encoding='utf-8'))

venues = read('src/atlas/venues.json')
circuits = {c['id']: c for c in read('artifacts/atlas-source/f1db-circuits.json')}
races = read('artifacts/atlas-source/f1db-races.json')
manifest = read('src/atlas/layout-provenance.json')
commit = manifest['commit']
entries = manifest['files']
out = ROOT/'public/atlas-layouts'
out.mkdir(exist_ok=True)
profiles = {}
jobs = {}
for venue in venues:
    c = circuits[venue['id']]
    held = sorted((r for r in races if r['circuitId']==c['id'] and r['date']<='2026-10-11'), key=lambda r:r['date'])
    # A venue not yet raced in the snapshot uses its published planned layout.
    row = held[-1] if held else next(r for r in races if r['circuitId']==c['id'])
    layout = row['circuitLayoutId']
    source = f'src/assets/circuits/white/{layout}.svg'
    if source not in entries:
        raise ValueError(f'Missing layout: {c["id"]} / {layout}')
    jobs[source] = out/f'{layout}.svg'
    profiles[c['id']] = dict(kind=row['circuitType'], direction=row['direction'], layoutId=layout,
        layoutYear=row['year'], lengthMetres=round(row['courseLength']*1000) if 'courseLength' in row else round(c['length']*1000),
        corners=row.get('turns', c['turns']), firstDate=held[0]['date'] if held else None,
        lastDate=held[-1]['date'] if held else None,
        layoutCount=len(set(r['circuitLayoutId'] for r in held)),
        previousNames=c.get('previousNames') or [], sourceCommit=commit)

def fetch(item):
    source, destination = item
    data = destination.read_bytes() if destination.exists() else None
    def valid(b):
        return b and hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==entries[source]['sha']
    if not valid(data):
        opener=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:7890'}))
        for attempt in range(4):
            try:
                data=opener.open(f'https://raw.githubusercontent.com/f1db/f1db/{commit}/{source}',timeout=40).read()
                break
            except Exception:
                if attempt==3: raise
                time.sleep(attempt+1)
        if not valid(data): raise ValueError(source+' hash mismatch')
        destination.write_bytes(data)
    if b'<script' in data or b'<foreignObject' in data: raise ValueError('Unexpected SVG content')
    return destination.name

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    files=list(pool.map(fetch,jobs.items()))
(ROOT/'src/atlas/profiles.json').write_text(json.dumps(profiles,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(out/'ATTRIBUTION.txt').write_text(f'Circuit layout artwork: F1DB contributors, Jules Roy and contributors. CC BY 4.0.\nSource: https://github.com/f1db/f1db/tree/{commit}/src/assets/circuits\nLicense: https://creativecommons.org/licenses/by/4.0/\nOriginal SVG geometry retained; displayed on a dark background.\n',encoding='utf-8')
print(f'{len(profiles)} venue profiles, {len(files)} verified SVG layouts, commit {commit}')
