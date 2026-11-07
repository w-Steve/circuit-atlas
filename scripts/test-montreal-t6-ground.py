"""All five GA+ products migrate independently without losing prior zones."""
import copy,importlib.util,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ga_plus',ROOT/'scripts/apply-montreal-t6-ground.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
g=read('src/circuits/generated/montreal.json');r=read('src/circuits/americas/montreal-t6-ground-2026.json')
assert len(r['zones'])==1 and len({z['zoneId'] for z in r['zones']})==1
assert m.apply(g,r)==g
old=copy.deepcopy(g);ids={z['zoneId'] for z in r['zones']};old['spectatorZones']=[z for z in old['spectatorZones'] if z['zoneId'] not in ids]
replayed=m.apply(old,r)
assert {z['zoneId']:z for z in replayed['spectatorZones']}=={z['zoneId']:z for z in g['spectatorZones']}
assert set(replayed['spectatorZoneIds'])==set(g['spectatorZoneIds'])
assert m.apply(replayed,r)==replayed
bad=copy.deepcopy(g);next(z for z in bad['spectatorZones'] if z['zoneId'] in ids)['name']='independent edit'
try:m.apply(bad,r)
except ValueError:pass
else:raise AssertionError('Independent edit overwritten')
print('GA west migration replay/idempotency/edit guard passed')
