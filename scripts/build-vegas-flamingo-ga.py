"""Historical initial sample acquisition. Current reviewed extents: extend-vegas-ga.py; replay via apply scripts."""
import copy,json,math,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString,Point
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/las-vegas.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(p/sc+o).tolist()
poly=lambda b:Polygon([xy(p) for p in b])
road=LineString([xy(p) for p in d['trackGeometry']['coordinates']]);c=next(c['coordinate'] for c in d['corners'] if c['number']==5)
s=road.project(Point(xy(c)))-300;a=np.array(road.interpolate(s).coords[0]);t=np.array(road.interpolate(s+1).coords[0])-np.array(road.interpolate(s-1).coords[0]);t/=np.linalg.norm(t);n=np.array([-t[1],t[0]])
b=[ll(a+t*x+n*y) for x,y in [(-30,20),(30,20),(30,32),(-30,32),(-30,20)]]
p=poly(b);f=read('src/circuits/facilities/las-vegas.json')
obs=[poly(s['boundary']) for z in d['spectatorZones'] for s in z['surfaces']]+[poly(b['boundary']) for b in f['buildings']]+[LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2) for l in f['pitLanes']]
assert all(p.intersection(other).area<.1 for other in obs),'Source association conflicts; do not translate merely for clearance'
src=dict(url='https://www.f1lasvegasgp.com/app/uploads/2026/03/FLAMINGO-1.png',checkedAt='2026-11-06',method='estimated',confidence='low',notes='Promoter2026 product location diagram places Flamingo on inner/west side of Koval betweenT4 andT5. Approximate60x12m standing subset300m beforeT5,20–32m driver-left, deck0.15m and standing1.65m. Diagram is schematic; longitudinal placement and dimensions are estimates, not surveyed boundary.')
z=dict(zoneId='ga-flamingo-koval',name='Flamingo GA · Koval',kind='general-admission',availability='available',boundary=b,supportToTerrain=True,
 surfaces=[dict(surfaceId='ga-flamingo-koval-1',boundary=b,baseHeight=.15,rise=0,eyeHeight=1.65,rows=0,frontReference=ll(a))],surface=dict(baseHeight=.15,rise=0,eyeHeight=1.65,depth=12),source=src,surfaceSource=copy.deepcopy(src),
 openingSource=dict(url='https://www.f1lasvegasgp.com/tickets/general-admission/flamingo-ga/',checkedAt='2026-11-06',method='published',confidence='high',notes='Opened2026 promoter product body: standing-only viewing, first-come access. Named annual product independently corroborated by2026-08-13 announcement.'),
 admissionNote='Flamingo GA独立站立区，先到先用；不含编号看台或T-Mobile区域。位置、范围及地面高度为近似。',description='Koval直道内侧近似站立区域，保留真实比例及几何遮挡。',geometryReview=dict(checkedAt='2026-11-06',issues=[],method='Explicit source-associated approximate platform; registered neighboring seats/facilities screened.'))
r=dict(circuitId='las-vegas',season=2026,zones=[z],beforeZones=[],sourceMapSha256=hashlib.sha256((ROOT/'research/season-review/las-vegas-2026/ga/flamingo-2026.png').read_bytes()).hexdigest(),coverage='Source-associated Flamingo Koval standing subset; full installation perimeter remains unverified.')
p=ROOT/'src/circuits/americas/las-vegas-flamingo-ga-2026.json';assert not p.exists();p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
