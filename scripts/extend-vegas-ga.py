"""Broaden the two source-mapped GA sectors; keep old samples and guarded replay."""
import copy,json,math,xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union,split
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/las-vegas.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(np.array(p)/sc+o).tolist()
poly=lambda b:Polygon([xy(p) for p in b])
road=LineString([xy(p) for p in d['trackGeometry']['coordinates']]);f=read('src/circuits/facilities/las-vegas.json')
ids=['ga-tmobile-t6','ga-flamingo-koval'];oldfiles=['las-vegas-tmobile-ga-2026.json','las-vegas-flamingo-ga-2026.json']
r=ET.parse(ROOT/'research/americas/las-vegas-osm.xml').getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in r.findall('node')};sphere=next(w for w in r.findall('way') if w.get('id')=='976405284');sphere=poly([nodes[n.get('ref')] for n in sphere.findall('nd')])
obs=[poly(s['boundary']).buffer(1) for z in d['spectatorZones'] if z['zoneId'] not in ids for s in z['surfaces']]+[poly(b['boundary']).buffer(1) for b in f['buildings']]+[LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2+1) for l in f['pitLanes']]+[road.buffer(d['trackGeometry']['widthMetres']/2+1),sphere.buffer(1)]
exclude=unary_union(obs)
def frame(s):
 a=np.array(road.interpolate(s).coords[0]);t=np.array(road.interpolate(s+1).coords[0])-np.array(road.interpolate(s-1).coords[0]);t/=np.linalg.norm(t);return a,t,np.array([-t[1],t[0]])
def parts(p):
 if p.is_empty:return []
 if p.geom_type!='Polygon':return [q for g in p.geoms for q in parts(g)]
 if p.interiors:
  x=Polygon(p.interiors[0]).centroid.x;_,y0,_,y1=p.bounds
  return [q for g in split(p,LineString([(x,y0-1),(x,y1+1)])).geoms for q in parts(g)]
 return [p] if p.area>50 else []
for i,(zid,file) in enumerate(zip(ids,oldfiles)):
 path=ROOT/'src/circuits/americas'/file;review=read(path.relative_to(ROOT));old=copy.deepcopy(review['beforeZones'][0] if review['beforeZones'] else review['zones'][0]);z=copy.deepcopy(old)
 if i==0:
  c=next(c['coordinate'] for c in d['corners'] if c['number']==6);arc=road.project(Point(xy(c)))
  frames=[frame(arc+s) for s in np.linspace(-150,85,49)]
  p=Polygon([a+n*18 for a,t,n in frames]+[a+n*50 for a,t,n in frames[::-1]])
  note='Expanded approximate innerT5–T6 GA envelope150m before to85m afterT6,18–50m driver-left, matched to the magenta sector east ofSphere in promoterLocation image. Do not interpret the entire pink T-Mobile zone outline or T7–T9 marketing views as additional guaranteed GA platforms.'
 else:
  c=next(c['coordinate'] for c in d['corners'] if c['number']==5);a,t,n=frame(road.project(Point(xy(c)))-300)
  p=Polygon([a+t*x+n*y for x,y in [(-60,20),(60,20),(60,50),(-60,50)]])
  note='Expanded approximate120x30m Flamingo standing envelope on the inner/west Koval side300m beforeT5,20–50m driver-left, matching the single named promoterLocation sector; exact temporary enclosure unknown.'
 p=unary_union([p.buffer(0),poly(old['boundary'])]).difference(exclude).buffer(0);surfaces=[]
 for q in parts(p):
  pts=np.array(q.exterior.coords[:-1]);center=pts.mean(axis=0);_,v=np.linalg.eigh((pts-center).T@(pts-center));axis=v[:,-1]
  surfaces.append(dict(surfaceId=zid+'-'+str(len(surfaces)+1),boundary=[ll(a) for a in q.exterior.coords],rowDirection=[float(axis[0]),float(-axis[1])],baseHeight=old['surface']['baseHeight'],rise=0,rows=0,eyeHeight=1.65))
 assert surfaces;z.update(boundary=surfaces[0]['boundary'],surfaces=surfaces)
 for key in ['source','surfaceSource']:z[key]['notes']=note+' Existing initial sample retained wherever outside actual road/reserved seats/facilities and nativeSphere footprint. Standing1.65m; deck heights remain explicit estimates, not surveyed floor.'
 z['description']='官方具名GA区域的连续近似范围，站姿眼高1.65米，保留实际遮挡。'
 z['geometryReview']['method']='Source-associated expanded sector; roads/reserved stands/facilities and nativeSphere footprint excluded. Not surveyed ticket fence.'
 review.update(zones=[z],beforeZones=[old],coverage=note+' Native Sphere excluded from pickable ground; its full architectural rendering remains incomplete.')
 path.write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n','utf8')
 print(zid,len(surfaces),round(sum(poly(s['boundary']).area for s in surfaces)))
