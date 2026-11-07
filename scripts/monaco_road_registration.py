"""Read-only Monaco official artwork and fixed road-arc registration."""
import ast,copy,hashlib,json,math
from pathlib import Path
import fitz
import numpy as np
from scipy.spatial import Delaunay
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
data=read('src/circuits/generated/monaco.json');metric=read('artifacts/goal-review/monaco-standing-metric.json')
assert metric['inputs']=={k:data[k] for k in ['trackGeometry','corners','elevation']}
alignment=read('src/circuits/europe/monaco-map-alignment.json')
public=read('src/circuits/europe/monaco-standing-2026.json')
assert hashlib.sha256((ROOT/'research/season-review/monaco2026/public-map.jpg').read_bytes()).hexdigest()==public['sourceSha256']
pdf=ROOT/'research/europe/monaco-official.pdf'
assert hashlib.sha256(pdf.read_bytes()).hexdigest()==alignment['basisPdfSha256']
page=fitz.open(pdf)[1];drawings=page.get_drawings()
road=[]
for kind,*ps in drawings[5142]['items']:
    if kind=='c':
        p,q,r,s=np.array(ps)
        road.extend([((1-t)**3*p+3*(1-t)**2*t*q+3*(1-t)*t*t*r+t**3*s)*alignment['basisScale'] for t in np.linspace(0,1,100)])
    elif kind=='l':road.extend(np.array(ps)*alignment['basisScale'])
    else:raise ValueError('Unknown basis road operator')
sourceRoad=LineString(road)
module=ast.parse((ROOT/'scripts/build-europe-spectators.py').read_text('utf8'))
controls=next(ast.literal_eval(n.value) for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='controls' for t in n.targets))['monaco']
o=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(o[1])),-111320])*metric['calibration']
worldRoad=LineString(metric['road']+[metric['road'][0]])
pixels=[];world=[];keys=list(controls)
for i,k in enumerate(keys):
    nxt=keys[(i+1)%len(keys)]
    sa=sourceRoad.project(Point(controls[k]));sb=sourceRoad.project(Point(controls[nxt]))
    corner=lambda n:(np.array(next(c['coordinate'] for c in data['corners'] if c['number']==n))-o)*factor
    wa=worldRoad.project(Point(corner(k)));wb=worldRoad.project(Point(corner(nxt)))
    for t in np.linspace(0,1,21,endpoint=False):
        pixels.append(sourceRoad.interpolate((sa+t*((sb-sa)%sourceRoad.length))%sourceRoad.length).coords[0])
        world.append(worldRoad.interpolate((wa+t*((wb-wa)%worldRoad.length))%worldRoad.length).coords[0])
pixels=np.array(pixels);world=np.array(world);tri=Delaunay(pixels)
def warp(p):
    index=int(tri.find_simplex(p));assert index>=0,'B outside source control support'
    ids=tri.simplices[index];a=np.c_[pixels[ids],np.ones(3)];b=world[ids]
    mapping=np.linalg.solve(a,b)
    assert np.linalg.det(mapping[:2])>0,'B inside a reversed registration triangle'
    return np.r_[p,1]@mapping

