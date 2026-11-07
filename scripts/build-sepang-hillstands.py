"""Named native hill parcels matched to the four published 2026 GA families."""
import copy,json,math,hashlib,xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/sepang.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(np.array(p)/sc+o).tolist()
poly=lambda b:Polygon([xy(p) for p in b])
r=ET.parse(ROOT/'research/asia/sepang-osm.xml').getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in r.findall('node')}
f=read('src/circuits/facilities/sepang.json')
ex=[poly(s['boundary']).buffer(1) for z in d['spectatorZones'] for s in z['surfaces']]+[poly(b['boundary']).buffer(1) for b in f['buildings']]+[LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2+1) for l in f['pitLanes']]+[LineString([xy(p) for p in d['trackGeometry']['coordinates']]).buffer(d['trackGeometry']['widthMetres']/2+2)]
exclude=unary_union(ex);template=read('src/circuits/europe/spa-bronze-2026.json')['zones'][0]
annual=read('src/circuits/season-review/sepang-public-inventory.json')
out=dict(circuitId='sepang',season=2026,zones=[],beforeZones=[],nativeSnapshotSha256=hashlib.sha256((ROOT/'research/asia/sepang-osm.xml').read_bytes()).hexdigest(),scope='All four ordinary hill ticket families have source-named native ground parcels. Geographic approximations, not legal ticket fences; historicalD/E hills excluded without2026 positive admission.')
entries=[('hill-k2','K2 Hillstand',['1105232828']),('hill-b','B Hillstand',['1106762515']),('hill-c','C Hillstand',['1105232835','1106524868','1105232834']),('hill-g','G Hillstand',['1105232829','1105232830','1105232831'])]
for zid,name,ways in entries:
 surfaces=[];originalArea=0
 for wid in ways:
  w=next(w for w in r.findall('way') if w.get('id')==wid);tags={a.get('k'):a.get('v') for a in w.findall('tag')};assert 'Hillstand' in tags['name']
  p=poly([nodes[n.get('ref')] for n in w.findall('nd')]);originalArea+=p.area;g=p.difference(exclude).buffer(0)
  parts=[g] if g.geom_type=='Polygon' else list(g.geoms)
  for p in parts:
   if p.area<80:continue
   assert not p.interiors,'Do not fill restricted holes'
   pts=np.array(p.exterior.coords[:-1]);center=pts.mean(axis=0);_,v=np.linalg.eigh((pts-center).T@(pts-center));axis=v[:,-1];n=np.array([-axis[1],axis[0]]);a=(pts-center)@axis;b=(pts-center)@n
   # Avoid sub-metre Float32 tips while retaining the native parcel.
   cut=Polygon([center+axis*x+n*y for x,y in [(a.min()+.5,b.min()-1),(a.max()-.5,b.min()-1),(a.max()-.5,b.max()+1),(a.min()+.5,b.max()+1)]])
   p=p.intersection(cut);assert p.geom_type=='Polygon'
   surfaces.append(dict(surfaceId=f'{zid}-{len(surfaces)+1}',boundary=[ll(q) for q in p.exterior.coords],rowDirection=[float(axis[0]),float(-axis[1])],baseHeight=.04,rise=0,rows=0,eyeHeight=1.65,terrainFollow=True,terrainMeshSpacingMetres=4))
 assert surfaces,zid
 z=copy.deepcopy(template);z.update(zoneId=zid,name=name,boundary=surfaces[0]['boundary'],surfaces=surfaces,surface=dict(baseHeight=.04,rise=0,eyeHeight=1.65,depth=30))
 for key in ['source','surfaceSource']:z[key]=dict(url='https://www.openstreetmap.org/way/'+ways[0],checkedAt='2026-11-06',method='estimated',confidence='low',notes='Named native '+','.join(ways)+f' parcels ({originalArea:.0f}m2 before exclusions) matched to annual{name} family; actual source terrain retained. Registered roads/stands/buildings/pits excluded and0.5m extreme tips omitted. Standing1.65m; no invented smooth slope, no legal ticket-fence claim. C2 partial shelter not modeled.')
 z['openingSource']=copy.deepcopy(annual['openingSource']);z['openingSource']['notes']='Co-promoter2026 overview explicitly names K2/B/C/G hill products, independently corroborated by dated2026 launch. G restricted toMyKad; sold-outC remains an annual offered product. Not MotoGP admission.'
 z['openingSource']['checkedAt']='2026-11-06'
 z['admissionNote']='G山坡限MyKad持有者；地块为近似范围，站姿眼高1.65米。' if zid=='hill-g' else '2026山坡自由观赛区，源地形站立，范围为近似；不含编号看台。'
 z['description']='独立地理山坡地块，保留地形与遮挡；不保证每处位置均能看到赛车。'
 z['geometryReview']=dict(checkedAt='2026-11-06',issues=[],method='Source-named native hill parcels, four annual ticket families, road and reserved-facility exclusions; terrain standing geometry.')
 out['zones'].append(z)
p=ROOT/'src/circuits/asia/sepang-hillstands-2026.json';assert not p.exists();p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n','utf8')
print([(z['zoneId'],len(z['surfaces'])) for z in out['zones']])
