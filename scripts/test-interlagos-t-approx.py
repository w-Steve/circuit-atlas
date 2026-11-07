import json,copy,math,importlib.util
from pathlib import Path
from shapely.geometry import Polygon,LineString
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
r=read('src/circuits/americas/interlagos-t-approx-2026.json');d=read('src/circuits/generated/interlagos.json')
spec=importlib.util.spec_from_file_location('patch',ROOT/'scripts/apply-interlagos-t-approx.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert m.apply(d,r)==d
old=copy.deepcopy(d);old['spectatorZones']=[z for z in old['spectatorZones'] if z['zoneId']!='setor-t'];assert m.apply(old,r)==d
bad=copy.deepcopy(d);next(z for z in bad['spectatorZones'] if z['zoneId']=='setor-t')['name']='independent'
try:m.apply(bad,r)
except ValueError:pass
else:raise AssertionError('Overwrote independent edit')
o=d['trackGeometry']['coordinates'][0];sx=111320*math.cos(math.radians(o[1]));xy=lambda p:((p[0]-o[0])*sx,(p[1]-o[1])*111320)
poly=lambda b:Polygon([xy(a) for a in b])
p=poly(r['zones'][0]['boundary']);road=LineString([xy(a) for a in d['trackGeometry']['coordinates']]);assert p.intersection(road.buffer(16)).area<.01
for z in d['spectatorZones']:
 if z['zoneId']!='setor-t':
  for sf in z['surfaces']:assert p.intersection(poly(sf['boundary'])).area<.01
f=read('src/circuits/facilities/interlagos.json')
for b in f['buildings']:assert p.intersection(poly(b['boundary'])).area<.01
for l in f['pitLanes']:assert p.intersection(LineString([xy(a) for a in l['coordinates']]).buffer(l['widthMetres']/2)).area<.01
assert 'setor-a' in {z['zoneId'] for z in d['spectatorZones']}
print('T distinct from reserved geometry and withdrawn models; migration and edit guard passed.')
