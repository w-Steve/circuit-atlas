"""Spa supplement migration and all-surface spatial checks."""
import copy,importlib.util,json,math
from shapely.geometry import Polygon,LineString
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ga_plus',ROOT/'scripts/apply-spa-annual-supplement.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
g=read('src/circuits/generated/spa.json');r=read('src/circuits/europe/spa-annual-supplement-2026.json')
assert {z['zoneId'] for z in r['zones']}=={'gold-4-eau-rouge','gold-5','fanzone-grandstand','fan-area-double-gauche','silver-5','silver-6','gold-2-gp2','gold-9-pole-position','bronze-4-pouhon'}
assert m.apply(g,r)==g
for previous in r['beforeZones']:
 current=next(z for z in g['spectatorZones'] if z['zoneId']==previous['zoneId'])
 assert {k:v for k,v in current.items() if k!='surfaces'}=={k:v for k,v in previous.items() if k!='surfaces'}
 assert current['surfaces'][:len(previous['surfaces'])]==previous['surfaces']
for relation in r['productAssociations']:
 zone=next(z for z in g['spectatorZones'] if z['zoneId']==relation['zoneId'])
 assert set(relation['surfaceIds'])<={s['surfaceId'] for s in zone['surfaces']}
 assert zone['kind']==('grass' if relation['productId'] in ['zone-verstappen','espace-17-27'] else 'grandstand')
old=copy.deepcopy(g);ids={z['zoneId'] for z in r['zones']};old['spectatorZones']=[z for z in old['spectatorZones'] if z['zoneId'] not in ids]
old['spectatorZones']+=copy.deepcopy(r['beforeZones'])
replayed=m.apply(old,r)
assert {z['zoneId']:z for z in replayed['spectatorZones']}=={z['zoneId']:z for z in g['spectatorZones']}
assert set(replayed['spectatorZoneIds'])==set(g['spectatorZoneIds'])
assert m.apply(replayed,r)==replayed
bad=copy.deepcopy(g);next(z for z in bad['spectatorZones'] if z['zoneId'] in ids)['name']='independent edit'
try:m.apply(bad,r)
except ValueError:pass
else:raise AssertionError('Independent edit overwritten')
o=g['trackGeometry']['coordinates'][0];sx=111320*math.cos(math.radians(o[1]))
xy=lambda p:((p[0]-o[0])*sx,(p[1]-o[1])*111320)
poly=lambda b:Polygon([xy(p) for p in b])
road=LineString([xy(p) for p in g['trackGeometry']['coordinates']])
facilities=read('src/circuits/facilities/spa.json')
for platform,surface in [(z,s) for z in r['zones'] for s in z['surfaces']]:
 footprint=poly(surface['boundary']);assert footprint.is_valid
 assert footprint.intersection(road.buffer(16)).area<.01
 for z in g['spectatorZones']:
  if z['zoneId']!=platform['zoneId']:
   for s in z['surfaces']:assert footprint.intersection(poly(s['boundary'])).area<.01
 for b in facilities['buildings']:assert footprint.intersection(poly(b['boundary'])).area<.01
 for lane in facilities['pitLanes']:
  assert footprint.intersection(LineString([xy(p) for p in lane['coordinates']]).buffer(lane['widthMetres']/2)).area<.01
print('Spa annual supplement migration replay/idempotency/edit guard passed')
