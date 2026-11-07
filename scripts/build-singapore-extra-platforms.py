"""Interpret discrete viewing-platform icons from the2026 illustrative park map."""
import copy,json,math
from pathlib import Path
import numpy as np
from shapely.geometry import LineString,Point,Polygon
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/singapore.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(p/sc+o).tolist()
road=LineString([xy(p) for p in d['trackGeometry']['coordinates']])
template=read('src/circuits/asia/singapore-walkabout-premier-2026.json')['zones'][0]
r=dict(circuitId='singapore',season=2026,zones=[],beforeZones=[],scope='Two additional approximate Premier platform groups, not full annual platform inventory or surveyed installation footprints.')
for zid,name,corner,delta,length,depth,height in [('walkabout-t2-t3','Premier Walkabout · T2–T3',3,-32,24,6,.8),('walkabout-t17','Premier Walkabout · T17 出弯',17,65,20,5,1.2)]:
 c=next(c['coordinate'] for c in d['corners'] if c['number']==corner);s=road.project(Point(xy(c)))+delta
 a=np.array(road.interpolate(s).coords[0]);t=np.array(road.interpolate(s+1).coords[0])-np.array(road.interpolate(s-1).coords[0]);t/=np.linalg.norm(t);n=np.array([-t[1],t[0]])
 b=[ll(a+t*x+n*y) for x,y in [(-length/2,16),(length/2,16),(length/2,16+depth),(-length/2,16+depth),(-length/2,16)]]
 z=copy.deepcopy(template);z.update(zoneId=zid,name=name,boundary=b)
 z['surfaces']=[dict(surfaceId=zid+'-1',boundary=b,baseHeight=height,rise=0,eyeHeight=1.65,rows=0,frontReference=ll(a))]
 z['surface'].update(baseHeight=height,depth=depth)
 for key in ['source','surfaceSource']:
  z[key].update(checkedAt='2026-11-06',method='estimated',confidence='low',notes=f'2026 promoter illustrative park map viewing-platform icon nearT2/T3 or afterT17. Author road-relative approximation {length}x{depth}m, height{height}m; no surveyed footprint or sightline-adjusted eyes. Premier access, not Zone4-only.')
 z['openingSource']['notes']='2026 Premier Walkabout access zones1–4 and dedicated viewing platforms; exact installation footprint remains an author approximation.'
 z['geometryReview'].update(checkedAt='2026-11-06')
 r['zones'].append(z)
p=ROOT/'src/circuits/asia/singapore-extra-platforms-2026.json';assert not p.exists()
p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
