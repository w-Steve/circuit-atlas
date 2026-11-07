"""Approximate discrete Stamford/Empress icons; no whole-zone access meshes."""
import copy,json,math
from pathlib import Path
import numpy as np
from shapely.geometry import LineString,Point,Polygon
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/singapore.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(p/sc+o).tolist()
poly=lambda b:Polygon([xy(p) for p in b])
road=LineString([xy(p) for p in d['trackGeometry']['coordinates']])
template=read('src/circuits/asia/singapore-walkabout-padang-2026.json')['zone']
f=read('src/circuits/facilities/singapore.json')
obstacles=[poly(s['boundary']) for z in d['spectatorZones'] for s in z['surfaces']]+[poly(b['boundary']) for b in f['buildings']]
obstacles += [LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2) for l in f['pitLanes']]
obstacles += [Polygon([xy(p) for p in w['rings'][0]],[[xy(p) for p in ring] for ring in w['rings'][1:]]) for w in read('src/circuits/water/singapore.json')['features']]
r=dict(circuitId='singapore',season=2026,zones=[],beforeZones=[],scope='Two explicit approximate Zone4 platform icons, not surveyed installation footprints.')
for zid,name,corner,delta,side,length,depth,height in [('walkabout-stamford','Zone 4 Walkabout · Stamford',7,-35,-1,16,5,.8),('walkabout-empress','Zone 4 Walkabout · Empress',11,25,1,20,6,.6)]:
 c=next(c['coordinate'] for c in d['corners'] if c['number']==corner);s=road.project(Point(xy(c)))+delta
 a=np.array(road.interpolate(s).coords[0]);t=np.array(road.interpolate(s+1).coords[0])-np.array(road.interpolate(s-1).coords[0]);t/=np.linalg.norm(t);n=np.array([-t[1],t[0]])*side
 b=[ll(a+t*x+n*y) for x,y in [(-length/2,18),(length/2,18),(length/2,18+depth),(-length/2,18+depth),(-length/2,18)]]
 p=poly(b);assert all(p.intersection(other).area<.1 for other in obstacles),zid+' conflicts; review source rather than translate to hide collision'
 z=copy.deepcopy(template);z.update(zoneId=zid,name=name,boundary=b,supportToTerrain=True)
 z['surfaces']=[dict(surfaceId=zid+'-1',boundary=b,baseHeight=height,rise=0,eyeHeight=1.65,rows=0,frontReference=ll(a))]
 z['surface'].update(baseHeight=height,depth=depth)
 for key in ['source','surfaceSource']:
  z[key].update(checkedAt='2026-11-06',method='estimated',confidence='low',notes=f'2026 illustrative promoter map viewing-platform icon in Zone4 at {name}. Author{length}x{depth}m, deck{height}m road-relative approximation; not surveyed event installation. Standing eye1.65m retained.')
 z['admissionNote']='Zone 4 Walkabout及Premier Walkabout可使用此区；平台范围与高度为近似。'
 z['description']='独立近似站立平台，保留现场几何遮挡。'
 z['geometryReview']=dict(checkedAt='2026-11-06',issues=[],method='Discrete illustrative-map platform; registered roads/neighbor seats/water/facilities checked.')
 r['zones'].append(z)
p=ROOT/'src/circuits/asia/singapore-zone4-extra-2026.json';assert not p.exists()
p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
