"""Recover the physical Pelouse remainder without inventing annual ticket allocation."""
import json,math,xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
g=read('src/circuits/generated/barcelona.json');o=g['trackGeometry']['coordinates'][0];sx=111320*math.cos(math.radians(o[1]))
xy=lambda p:((p[0]-o[0])*sx,(p[1]-o[1])*111320)
ll=lambda p:[p[0]/sx+o[0],p[1]/111320+o[1]]
poly=lambda b:Polygon([xy(p) for p in b])
r=ET.parse(ROOT/'research/local-polish/barcelona-osm.xml').getroot()
nodes={n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])] for n in r.findall('node')}
w=next(w for w in r.findall('way') if w.attrib['id']=='1427286513')
source=poly([nodes[n.attrib['ref']] for n in w.findall('nd')]);assert source.is_valid
f=read('src/circuits/facilities/barcelona.json')
ex=[poly(s['boundary']).buffer(1) for z in g['spectatorZones'] for s in z['surfaces']]
ex += [poly(b['boundary']).buffer(1) for b in f['buildings']]
ex += [LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2+1) for l in f['pitLanes']]
ex += [LineString([xy(p) for p in g['trackGeometry']['coordinates']]).buffer(16)]
remaining=source.difference(unary_union(ex)).buffer(0)
parts=[remaining] if remaining.geom_type=='Polygon' else list(remaining.geoms)
parts=[p for p in parts if p.area>100]
assert parts
out={'circuitId':'barcelona','season':2026,'checkedAt':'2026-11-06','nativeWayId':1427286513,
 'nativeSource':'https://www.openstreetmap.org/way/1427286513','license':'ODbL-1.0',
 'annualAccessReview':'src/circuits/season-review/barcelona-pelouse-access-review-2026.json',
 'scope':'Physical Pelouse remainder alongT5–T9 after existing stands/ground and registered facilities/pits/road buffer exclusions. Not certified ordinary2026 ticket geography.',
 'runtimeApplied':False,'sourceAreaM2':round(source.area,1),'candidateAreaM2':round(sum(p.area for p in parts),1),
 'parts':[{'boundary':[ll(a) for a in p.exterior.coords],'holes':[[ll(a) for a in ring.coords] for ring in p.interiors],'areaM2':round(p.area,1)} for p in parts],
 'nextAction':'Compare candidate parts with annual common/Privilege enclosure. Keep holes as exclusions; split into selectable patches only after access interpretation. Do not repeat blocked Onebox or generic supplier PDF.'}
p=ROOT/'src/circuits/europe/barcelona-pelouse-remainder-candidate-2026.json'
assert not p.exists(),'Preserve independently reviewed candidate'
p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(len(parts),'candidate parts;',out['candidateAreaM2'],'m2; runtime unchanged')
