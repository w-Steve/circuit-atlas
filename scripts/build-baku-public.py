"""Approximate omitted ordinary 2026 banks and Boulevard roaming ground."""
import copy,json,math,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/baku.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(np.array(p)/sc+o).tolist()
poly=lambda b:Polygon([xy(p) for p in b])
road=LineString([xy(p) for p in d['trackGeometry']['coordinates']]);f=read('src/circuits/facilities/baku.json')
fixed=[poly(s['boundary']) for z in d['spectatorZones'] for s in z['surfaces']]+[poly(b['boundary']) for b in f['buildings']]+[LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2) for l in f['pitLanes']]+[road.buffer(d['trackGeometry']['widthMetres']/2+.5)]
template=d['spectatorZones'][0]
url='https://web.archive.org/web/20260826083329id_/https://www.bakucitycircuit.com/buy-now'
out=dict(circuitId='baku',season=2026,zones=[],beforeZones=[],sourceUrl=url,sourceSha256=hashlib.sha256((ROOT/'research/season-review/baku-2026/buy-now-archive.html').read_bytes()).hexdigest(),scope='Ordinary banks named in archived2026 catalog; local footprint/profile estimates associated to organizer schematic and independent landmark/turn descriptions. Not surveyed structures.')
products=read('research/season-review/baku-2026/annual-products.json')
def frame(corner,delta):
 c=next(c['coordinate'] for c in d['corners'] if c['number']==corner);s=road.project(Point(xy(c)))+delta
 # Wrap at the source polyline seam on the main straight.
 s%=road.length;a=np.array(road.interpolate(s).coords[0]);t=np.array(road.interpolate((s+1)%road.length).coords[0])-np.array(road.interpolate((s-1)%road.length).coords[0]);t/=np.linalg.norm(t)
 return a,t
def boundary(a,t,side,length,near,depth):
 n=np.array([-t[1],t[0]])*side
 return [ll(a+t*x+n*y) for x,y in [(-length/2,near),(length/2,near),(length/2,near+depth),(-length/2,near+depth),(-length/2,near)]]
# Source-assigned turn/landmark association. Dimensions/rows are estimates.
entries=[('champions','Champions',20,420,1,50,25,16,16,2.0,6.4),('icheri-sheher','Icheri Sheher',12,70,1,40,20,12,12,1.5,4.4),('giz-galasi','Giz Galasi',18,65,-1,45,25,15,15,1.5,5.6),('filarmoniya','Filarmoniya',16,-75,1,36,24,14,14,1.5,5.2),('zafar','Zafar',1,-740,-1,50,25,17,17,2.2,7.0),('city','City',6,120,-1,42,24,14,14,1.8,5.5),('marine','MARINE',17,30,-1,40,27,15,15,1.8,5.8)]
for zid,name,corner,delta,side,length,near,depth,rows,base,rise in entries:
 a,t=frame(corner,delta);b=boundary(a,t,side,length,near,depth);p=poly(b)
 hits=[p.intersection(q).area for q in fixed]
 assert max(hits,default=0)<.1,(zid,max(hits))
 z=copy.deepcopy(template);z.update(zoneId=zid,name=name,boundary=b,surfaces=[dict(surfaceId=zid+'-1',boundary=b,baseHeight=base,rise=rise,rows=rows,eyeHeight=1.2,frontReference=ll(a))],surface=dict(baseHeight=base,rise=rise,eyeHeight=1.2,depth=depth))
 product=next(p for p in products if p['name']==name)
 for key in ['source','surfaceSource']:z[key]=dict(url=product['location_desktop_url'],checkedAt='2026-11-06',method='estimated',confidence='low',notes=f'Archived2026 organizer catalog ordinary Grandstands product, not hospitality. Schematic/landmark association: corner{corner}, arc{delta:+}m, driver-'+('left' if side>0 else 'right')+f'. Author {length}x{depth}m envelope, near offset{near}m, {rows}rows, base{base}m/rise{rise}m estimates. Seated eye1.2m; not surveyed location/profile.')
 z['openingSource']=dict(url=url,checkedAt='2026-11-06',method='published',confidence='high',notes='Archived August26,2026 organizer buy-now catalog explicitly lists this bank under ordinary Grandstands; Champions Club/Paddock/VIPLANE are separate Premium Hospitality products.')
 z['admissionNote']='2026普通座席看台；边界、排数与坡面为近似，不含贵宾接待权益。'
 z['description']='按官方具名区域与实际道路关联的近似阶梯看台，坐姿眼高1.2米。'
 z['geometryReview']=dict(checkedAt='2026-11-06',issues=[],method='Source-associated approximate bank screened against actual road, registered seats, buildings and pit lanes.')
 out['zones'].append(z);fixed.append(p)
ga=copy.deepcopy(read('src/circuits/europe/spa-bronze-2026.json')['zones'][0]);surfaces=[]
ex=unary_union([q.buffer(1) for q in fixed])
for corner,delta in [(19,70),(20,220),(20,850)]:
 a,t=frame(corner,delta);p=poly(boundary(a,t,-1,60,26,18)).difference(ex).buffer(0)
 parts=[p] if p.geom_type=='Polygon' else list(p.geoms)
 for q in parts:
  if q.area<80:continue
  assert not q.interiors,'Never fill reserved holes'
  surfaces.append(dict(surfaceId='roaming-boulevard-'+str(len(surfaces)+1),boundary=[ll(v) for v in q.exterior.coords],baseHeight=.04,rise=0,rows=0,eyeHeight=1.65,terrainFollow=True,terrainMeshSpacingMetres=4,rowDirection=[float(t[0]),float(-t[1])],frontReference=ll(a)))
assert surfaces
ga.update(zoneId='roaming-boulevard',name='Roaming · Boulevard',boundary=surfaces[0]['boundary'],surfaces=surfaces,surface=dict(baseHeight=.04,rise=0,eyeHeight=1.65,depth=18))
for key in ['source','surfaceSource']:ga[key]=dict(url=url,checkedAt='2026-11-06',method='estimated',confidence='low',notes='Annual GA ticket confirmed in2026 archived catalog. Approximate Boulevard-side standing ground groups alongT19/main straight, excluding registered reserved seats/facilities/road. Prior promoter wayfinding and2026 ticket descriptions associate roaming with Boulevard, not every street or castle balcony. Exact installation and complete viewing perimeter unverified. Standing1.65m on source terrain.')
ga['openingSource']=dict(url=url,checkedAt='2026-11-06',method='published',confidence='high',notes='General Admission Ticket is a separate Thursday–Saturday product in archived2026 catalog; not an assigned grandstand seat. Do not import current2027 product dates.')
ga['admissionNote']='2026 Roaming自由观赛近似范围，周四至周六，不含编号看台及演唱会；不保证每点无遮挡。'
ga['description']='滨海Boulevard一侧的近似站立地面，眼高1.65米。'
ga['geometryReview']=dict(checkedAt='2026-11-06',issues=[],method='Approximate source-associated Boulevard ground; reserved footprints removed, no forced visibility.')
out['zones'].append(ga)
p=ROOT/'src/circuits/asia/baku-public-2026.json';assert not p.exists();p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n','utf8')
print([(z['zoneId'],len(z['surfaces'])) for z in out['zones']])
