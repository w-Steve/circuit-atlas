"""Check migration and ground subsets against the actual source exclusions."""
import copy,importlib.util,json,math
from pathlib import Path
from shapely.geometry import Polygon,LineString
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
spec=importlib.util.spec_from_file_location('patch',ROOT/'scripts/apply-montreal-ga-bands.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=read('src/circuits/americas/montreal-ga-bands-2026.json');d=read('src/circuits/generated/montreal.json')
assert m.apply(d,r)==d
ids={z['zoneId'] for z in r['zones']};old=copy.deepcopy(d)
old['spectatorZones']=[z for z in old['spectatorZones'] if z['zoneId'] not in ids]
assert m.apply(old,r)==d
bad=copy.deepcopy(d);next(z for z in bad['spectatorZones'] if z['zoneId'] in ids)['name']='independent edit'
try:m.apply(bad,r)
except ValueError:pass
else:raise AssertionError('Independent edit overwritten')
o=d['trackGeometry']['coordinates'][0];sx=111320*math.cos(math.radians(o[1]))
xy=lambda p:((p[0]-o[0])*sx,(p[1]-o[1])*111320)
poly=lambda b:Polygon([xy(a) for a in b])
f=read('src/circuits/facilities/montreal.json');raw=read('research/americas/montreal-pam-public/response-1.json')
water=[Polygon([xy(a) for a in w['rings'][0]],[[xy(a) for a in ring] for ring in w['rings'][1:]]) for w in read('src/circuits/water/montreal.json')['features']]
blue=poly(read('src/circuits/americas/montreal-ga-access-2026.json')['excludedAccessAreas'][0]['boundary'])
for z,label in zip(r['zones'],['Yellow Zone','Green Zone']):
 loc=next(a for a in raw['locations'] if a.get('displayText')==label)
 area=poly(next(a for a in raw['navMap']['features'] if a['id']==loc['featureId'])['geometry']['coordinates'][0])
 for s in z['surfaces']:
  p=poly(s['boundary']);assert p.is_valid and p.difference(area).area<.01
  for other in water+[blue]+[poly(b['boundary']) for b in f['buildings']]+[LineString([xy(a) for a in lane['coordinates']]).buffer(lane['widthMetres']/2) for lane in f['pitLanes']]:assert p.intersection(other).area<.1
print('Migration replay, edit guard and source-zone/water/Blue/building/pit exclusions passed.')
