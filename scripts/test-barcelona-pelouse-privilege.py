"""Guard the X migration and registered facility clearance in local metric units."""
import copy,importlib.util,json,math
from pathlib import Path
from shapely.geometry import Polygon,LineString
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
spec=importlib.util.spec_from_file_location('patch',ROOT/'scripts/apply-barcelona-pelouse-privilege.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=read('src/circuits/europe/barcelona-pelouse-privilege-2026.json');d=read('src/circuits/generated/barcelona.json')
before=copy.deepcopy(d)
new_ids={z['zoneId'] for z in r['zones']}
before['spectatorZones']=[z for z in before['spectatorZones'] if z['zoneId'] not in new_ids]
before['spectatorZoneIds']=[z['zoneId'] for z in before['spectatorZones'] if z['availability']=='available']
for z in r['beforeZones']:
 before['spectatorZones']=[z if a['zoneId']==z['zoneId'] else a for a in before['spectatorZones']]
assert m.apply(before,r)==d and m.apply(d,r)==d
edited=copy.deepcopy(d);next(z for z in edited['spectatorZones'] if z['zoneId']==r['zones'][0]['zoneId'])['description']='independent edit'
try:m.apply(edited,r)
except ValueError:pass
else:raise AssertionError('Independent edit was overwritten')
o=d['trackGeometry']['coordinates'][0];sx=111320*math.cos(math.radians(o[1]))
xy=lambda p:((p[0]-o[0])*sx,(p[1]-o[1])*111320)
f=read('src/circuits/facilities/barcelona.json')
for z in r['zones']:
 p=Polygon([xy(a) for a in z['boundary']]);assert p.is_valid
 for b in f['buildings']:assert p.intersection(Polygon([xy(a) for a in b['boundary']])).area<.1
 for lane in f['pitLanes']:assert p.intersection(LineString([xy(a) for a in lane['coordinates']]).buffer(lane['widthMetres']/2)).area<.1
print('Privilege migration replay, idempotence, edit protection and registered facility clearance passed.')

import xml.etree.ElementTree as ET
rxml=ET.parse(ROOT/'research/local-polish/barcelona-osm.xml').getroot()
nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in rxml.findall('node')}
w=next(w for w in rxml.findall('way') if w.get('id')=='1530387870')
native=Polygon([xy(nodes[n.get('ref')]) for n in w.findall('nd')])
road=LineString([xy(a) for a in d['trackGeometry']['coordinates']]).buffer(16)
area=0
for z in r['zones']:
 for sf in z['surfaces']:
  p=Polygon([xy(a) for a in sf['boundary']]);assert p.is_valid and not p.interiors
  assert p.difference(native).area<.01 and p.intersection(road).area<.01
  for other in d['spectatorZones']:
   if other['zoneId']==z['zoneId']:continue
   for os in other['surfaces']:assert p.intersection(Polygon([xy(a) for a in os['boundary']])).area<.01
  area+=p.area
assert area>2000
print('Named native containment, road/other-zone exclusion passed; area',round(area))
