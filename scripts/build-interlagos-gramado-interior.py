"""Positive 2026 Village sector intersected with native grass, not the whole landuse way."""
import copy,json,math,xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union,substring,split
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/interlagos.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(np.array(p)/sc+o).tolist()
poly=lambda b:Polygon([xy(p) for p in b])
road=LineString([xy(p) for p in d['trackGeometry']['coordinates']]);arcs={c['number']:road.project(Point(xy(c['coordinate']))) for c in d['corners']}
assert arcs[14]>arcs[10]
# Promoter explicitly locates Village among BicoDePato, Mergulho, Juncao,
# SubidaDoCafe. Closing the inner T10–T14 loop is an estimated access boundary,
# positively associated to this named sector, not arbitrary whole-parcel access.
sector=Polygon(substring(road,arcs[10],arcs[14]).coords).buffer(0)
r=ET.parse(ROOT/'research/season-review/interlagos-2026/gramado-native.xml').getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in r.findall('node')};w=next(w for w in r.findall('way') if w.get('id')=='1263139998');grass=poly([nodes[n.get('ref')] for n in w.findall('nd')])
f=read('src/circuits/facilities/interlagos.json');ex=[poly(s['boundary']).buffer(1) for z in d['spectatorZones'] for s in z['surfaces']]+[poly(b['boundary']).buffer(1) for b in f['buildings']]+[LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2+1) for l in f['pitLanes']]+[road.buffer(16)]
ground=grass.intersection(sector).difference(unary_union(ex)).buffer(0)
def parts(p):
 if p.is_empty:return []
 if p.geom_type!='Polygon':return [q for g in p.geoms for q in parts(g)]
 if p.interiors:
  x=Polygon(p.interiors[0]).centroid.x;_,a,_,b=p.bounds
  return [q for g in split(p,LineString([(x,a-1),(x,b+1)])).geoms for q in parts(g)]
 return [p] if p.area>80 else []
surfaces=[]
for p in parts(ground):
 pts=np.array(p.exterior.coords[:-1]);center=pts.mean(axis=0);_,v=np.linalg.eigh((pts-center).T@(pts-center));axis=v[:,-1];n=np.array([-axis[1],axis[0]]);a=(pts-center)@axis;b=(pts-center)@n
 cut=Polygon([center+axis*x+n*y for x,y in [(a.min()+.5,b.min()-1),(a.max()-.5,b.min()-1),(a.max()-.5,b.max()+1),(a.min()+.5,b.max()+1)]])
 for q in parts(p.intersection(cut)):
  surfaces.append(dict(surfaceId='gramado-interior-'+str(len(surfaces)+1),boundary=[ll(x) for x in q.exterior.coords],rowDirection=[float(axis[0]),float(-axis[1])],baseHeight=.04,rise=0,rows=0,eyeHeight=1.65,terrainFollow=True,terrainMeshSpacingMetres=4))
assert surfaces
z=copy.deepcopy(next(z for z in d['spectatorZones'] if z['zoneId']=='heineken-gramado-north'));z.update(zoneId='gramado-interior',name='Village Gramado · 内场草地',boundary=surfaces[0]['boundary'],surfaces=surfaces,surface=dict(baseHeight=.04,rise=0,eyeHeight=1.65,depth=50))
url='https://atendimento.f1saopaulo.com.br/hc/pt-br/articles/37964571167387-Onde-est%C3%A1-localizada-a-%C3%A1rea-Heineken-Village'
for key in ['source','surfaceSource']:z[key]=dict(url='https://www.openstreetmap.org/way/1263139998',checkedAt='2026-11-06',method='estimated',confidence='low',notes='Native ground intersected with positively named2026 Village innerT10–T14 sector, approximate T14-toT10 closure, not the entire72265m2 landuse polygon. Existing three samples, Estrela, reserved stands, buildings, pits and16m road corridor excluded; holes split without filling, source terrain preserved, standing1.65m.')
z['openingSource']=dict(url=url,checkedAt='2026-11-06',method='published',confidence='high',notes='Actual organizer help updated2026-03-31 places Village among BicoDePato/Mergulho/Juncao/SubidaDoCafe, minimum18. Separate product-definition article confirms Gramado trackside grass; Estrela access is not reciprocal.')
z['admissionNote']='Gramado票区，限18岁以上；不含Estrela高台。范围为近似，沿源地形站立。'
z['description']='内场草地连续选点，站姿眼高1.65米；山坡与围网可能遮挡。'
z['geometryReview']=dict(checkedAt='2026-11-06',issues=[],method='Positive annual Village-sector association plus native grass; excludes all registered reservations and real road, no whole-way admission inference.')
out=dict(circuitId='interlagos',season=2026,zones=[z],beforeZones=[],locationSource=url,sourceSectorBoundary=[ll(p) for p in sector.exterior.coords],coverage='Remaining source-associated inner Village grass complements three existing trackside groups. Exact annual fence, paths and limited-capacity seating remain facility refinements.')
p=ROOT/'src/circuits/americas/interlagos-gramado-interior-2026.json';assert not p.exists();p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n','utf8')
print(len(surfaces),'ground pieces;',round(sum(poly(s['boundary']).area for s in surfaces)),'m2')
