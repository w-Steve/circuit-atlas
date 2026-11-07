"""Two approximate Village inner-bank sectors, clipped to physical source grass."""
import copy,json,math,xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/interlagos.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(np.array(p)/sc+o).tolist()
poly=lambda b:Polygon([xy(p) for p in b])
road=LineString([xy(p) for p in d['trackGeometry']['coordinates']])
root=ET.parse(ROOT/'research/season-review/interlagos-2026/gramado-native.xml').getroot()
nodes={n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])] for n in root.findall('node')}
w=next(w for w in root.findall('way') if w.attrib['id']=='1263139998')
grass=poly([nodes[n.attrib['ref']] for n in w.findall('nd')]);assert grass.is_valid
f=read('src/circuits/facilities/interlagos.json')
ex=[poly(s['boundary']).buffer(1) for z in d['spectatorZones'] for s in z['surfaces']]
ex += [poly(b['boundary']).buffer(1) for b in f['buildings']]
ex += [LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2+1) for l in f['pitLanes']]
ex += [road.buffer(16)]
exclude=unary_union(ex)
template=next(z for z in d['spectatorZones'] if z['zoneId']=='heineken-gramado-north')
r=dict(circuitId='interlagos',season=2026,zones=[],beforeZones=[],scope='Approximate inner Village viewing-bank sectors; not full surveyed legal ticket perimeter or Estrela entitlement.')
for zid,name,corner,offset,length in [('gramado-t12','Village Gramado · T12 内侧',12,-110,100),('gramado-t13-t14','Village Gramado · T13–T14',13,110,120)]:
 c=next(c['coordinate'] for c in d['corners'] if c['number']==corner);arc=road.project(Point(xy(c)))+offset
 a=np.array(road.interpolate(arc).coords[0]);t=np.array(road.interpolate(arc+2).coords[0])-np.array(road.interpolate(arc-2).coords[0]);t/=np.linalg.norm(t);n=np.array([-t[1],t[0]])
 g=Polygon([a+t*x+n*y for x,y in [(-length/2,20),(length/2,20),(length/2,40),(-length/2,40)] ]).intersection(grass).difference(exclude).buffer(0)
 parts=[g] if g.geom_type=='Polygon' else list(g.geoms)
 parts=[p for p in parts if p.area>80];assert parts,zid
 surfaces=[]
 for p in parts:
  assert not p.interiors,'Retain holes; do not fill reserved areas'
  pts=np.array(p.exterior.coords[:-1]);center=pts.mean(axis=0);_,v=np.linalg.eigh((pts-center).T@(pts-center));axis=v[:,-1];normal=np.array([-axis[1],axis[0]])
  along=(pts-center)@axis;across=(pts-center)@normal
  cut=Polygon([center+axis*x+normal*y for x,y in [(along.min()+.5,across.min()-1),(along.max()-.5,across.min()-1),(along.max()-.5,across.max()+1),(along.min()+.5,across.max()+1)]])
  p=p.intersection(cut);assert p.geom_type=='Polygon'
  surfaces.append(dict(surfaceId=zid+f'-{len(surfaces)+1}',boundary=[ll(p) for p in p.exterior.coords],rowDirection=[float(axis[0]),float(-axis[1])],baseHeight=.04,rise=0,rows=0,eyeHeight=1.65,terrainFollow=True,terrainMeshSpacingMetres=4))
 z=copy.deepcopy(template);z.update(zoneId=zid,name=name,boundary=surfaces[0]['boundary'],surfaces=surfaces)
 z['surface'].update(depth=20)
 for key in ['source','surfaceSource']:
  z[key].update(checkedAt='2026-11-06',method='estimated',confidence='low',notes='Author approximate inner Village sector,20–40m left of actual road, clipped to native grass1263139998 and excluding registered seats/Estrela/buildings/pits/road. Source terrain standing1.65m, not surveyed annual ticket perimeter.')
 z['description']='Village内侧近似草地，地形及围网可能影响视线。'
 z['admissionNote']='Gramado区域，18岁及以上；不含Estrela平台，现场票界为近似。'
 z['geometryReview']=dict(checkedAt='2026-11-06',issues=[],method='Separate native-ground-clipped Village sector; actual road and registered facilities screened.')
 r['zones'].append(z)
p=ROOT/'src/circuits/americas/interlagos-gramado-bands-2026.json';assert not p.exists()
p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print([(z['zoneId'],len(z['surfaces'])) for z in r['zones']])
