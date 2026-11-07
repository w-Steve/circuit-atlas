"""Approximate six named 2026 Bronze sectors on the actual road and terrain."""
import copy,json,math,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/spa.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(np.array(p)/sc+o).tolist()
poly=lambda b:Polygon([xy(p) for p in b])
road=LineString([xy(p) for p in d['trackGeometry']['coordinates']]);f=read('src/circuits/facilities/spa.json')
excluded=unary_union([poly(s['boundary']).buffer(1) for z in d['spectatorZones'] for s in z['surfaces']]+[poly(b['boundary']).buffer(1) for b in f['buildings']]+[LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2+1) for l in f['pitLanes']]+[road.buffer(16)])
url='https://web.archive.org/web/20260114004529id_/https://www.spagrandprix.com/en/ticketing/ticket/map'
template=read('src/circuits/europe/hungaroring-ga-bands-2026.json')['zones'][0]
out=dict(circuitId='spa',season=2026,zones=[],beforeZones=[],sourceUrl=url,sourceSha256=hashlib.sha256((ROOT/'research/season-review/spa-bronze/annual-map.html').read_bytes()).hexdigest(),coverage='Six approximate major Bronze viewing sectors, including the separately ticketed Bruxelles area; not surveyed annual boundaries.')
# Corner, along-road displacement, side (+ left), length and lateral interval.
entries=[('bronze-1-kemmel','Bronze 1 · Kemmel',5,-400,1,160,25,43),('bronze-bruxelles','Bronze · Bruxelles',8,-30,-1,40,30,42),('bronze-3-descent','Bronze 3 · Pouhon 下坡',9,140,-1,100,25,43),('bronze-4-pouhon','Bronze 4 · Double Gauche',11,90,-1,100,26,44),('bronze-5-stavelot','Bronze 5 · Stavelot',14,50,-1,80,27,43),('bronze-6-blanchimont','Bronze 6 · Blanchimont',17,-100,1,120,25,43)]
for zid,name,corner,delta,side,length,near,far in entries:
 c=next(c['coordinate'] for c in d['corners'] if c['number']==corner);s=road.project(Point(xy(c)))+delta;a=np.array(road.interpolate(s).coords[0]);t=np.array(road.interpolate(s+1).coords[0])-np.array(road.interpolate(s-1).coords[0]);t/=np.linalg.norm(t);n=np.array([-t[1],t[0]])*side
 p=Polygon([a+t*x+n*y for x,y in [(-length/2,near),(length/2,near),(length/2,far),(-length/2,far)]]).difference(excluded).buffer(0)
 parts=[p] if p.geom_type=='Polygon' else list(p.geoms);parts=[q for q in parts if q.area>50];assert parts,zid
 surfaces=[]
 for q in parts:
  assert not q.interiors,'Do not fill reserved holes'
  surfaces.append(dict(surfaceId=f'{zid}-{len(surfaces)+1}',boundary=[ll(p) for p in q.exterior.coords],rowDirection=[float(t[0]),float(-t[1])],baseHeight=.04,rise=0,rows=0,eyeHeight=1.65,terrainFollow=True,terrainMeshSpacingMetres=4,frontReference=ll(a)))
 z=copy.deepcopy(template);z.update(zoneId=zid,name=name,boundary=surfaces[0]['boundary'],surfaces=surfaces,surface=dict(baseHeight=.04,rise=0,eyeHeight=1.65,depth=far-near))
 for key in ['source','surfaceSource']:
  z[key]=dict(url=url,checkedAt='2026-11-06',method='estimated',confidence='low',notes=f'Annual organizer SVG identifies this named Bronze sector. Approximate road-relative {length}m x {far-near}m ground band at corner{corner} arc{delta:+}m, driver-'+('left' if side>0 else 'right')+'. Position and extent estimated from schematic, reserved stands/buildings/pits/road excluded; source terrain retained, standing eye1.65m. Not surveyed footprint.')
 z['openingSource']=dict(url=url,checkedAt='2026-11-06',method='published',confidence='high',notes='January14 archive explicitly names BelgianGP2026 July16–19; SVG has five shared zone-bronze groups and separately ticketed zone-bronze-bruxelles. No assigned seat.')
 z['admissionNote']='Bruxelles独立Bronze票区，普通Bronze不包含本区；范围为近似。' if 'bruxelles' in zid else '普通Bronze近似草地范围；不含编号看台或独立Bruxelles票区。'
 z['description']='沿源地形站立观赛，眼高1.65米，保留坡面与围网遮挡。'
 z['geometryReview']=dict(checkedAt='2026-11-06',issues=[],method='Named annual schematic sector associated to actual roadway; approximate ground envelope excludes registered reserved structures and road.')
 out['zones'].append(z)
p=ROOT/'src/circuits/europe/spa-bronze-2026.json';assert not p.exists();p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n','utf8')
print([(z['zoneId'],len(z['surfaces'])) for z in out['zones']])
