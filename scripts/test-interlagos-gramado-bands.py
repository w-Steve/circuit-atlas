"""Guard the X migration and registered facility clearance in local metric units."""
import copy,importlib.util,json,math
from pathlib import Path
from shapely.geometry import Polygon,LineString
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
spec=importlib.util.spec_from_file_location('patch',ROOT/'scripts/apply-interlagos-gramado-bands.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=read('src/circuits/americas/interlagos-gramado-bands-2026.json');d=read('src/circuits/generated/interlagos.json')
before=copy.deepcopy(d)
for z in r['beforeZones']:
 before['spectatorZones']=[z if a['zoneId']==z['zoneId'] else a for a in before['spectatorZones']]
assert m.apply(before,r)==d and m.apply(d,r)==d
edited=copy.deepcopy(d);next(z for z in edited['spectatorZones'] if z['zoneId']==r['zones'][0]['zoneId'])['description']='independent edit'
try:m.apply(edited,r)
except ValueError:pass
else:raise AssertionError('Independent edit was overwritten')
o=d['trackGeometry']['coordinates'][0];sx=111320*math.cos(math.radians(o[1]))
xy=lambda p:((p[0]-o[0])*sx,(p[1]-o[1])*111320)
f=read('src/circuits/facilities/interlagos.json')
for z in r['zones']:
 p=Polygon([xy(a) for a in z['boundary']]);assert p.is_valid
 for b in f['buildings']:assert p.intersection(Polygon([xy(a) for a in b['boundary']])).area<.1
 for lane in f['pitLanes']:assert p.intersection(LineString([xy(a) for a in lane['coordinates']]).buffer(lane['widthMetres']/2)).area<.1
print('X1/X2 migration replay, idempotence, edit protection and registered facility clearance passed.')
