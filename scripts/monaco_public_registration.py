"""Read-only public-artwork registration with independent geographic controls.
Image correspondences remain approximate; no runtime writes or acceptance.
"""
from monaco_road_registration import ROOT,read,data,metric,alignment,public,worldRoad,o,factor,np,Polygon,Point,unary_union,hashlib,json
import monaco_road_registration as road
import math
import xml.etree.ElementTree as ET
from scipy.spatial import Delaunay

osm=ROOT/'research/season-review/monaco2026/rocher-osm-map.xml';retrieval=read('research/season-review/monaco2026/rocher-osm-fetch.json')
assert hashlib.sha256(osm.read_bytes()).hexdigest()==retrieval['sha256']
assert retrieval['url']=='https://api.openstreetmap.org/api/0.6/map?bbox=7.4165,43.728,7.429,43.737'
tree=ET.fromstring(osm.read_bytes());nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in tree.findall('node')}
nodeRoadNames={}
for way in tree.findall('way'):
    tags={t.get('k'):t.get('v') for t in way.findall('tag')}
    if tags.get('highway'):
        for node in way.findall('nd'):nodeRoadNames.setdefault(node.get('ref'),set()).add(tags.get('name',''))
for node,names in {'1866423016':{'Avenue du Port',"Place d'Armes"},'1868334418':{'Rue des Remparts','Place du Palais'},'25181806':{'Avenue Saint-Martin','Rue Colonel Bellando de Castro'}}.items():
    assert names<=nodeRoadNames.get(node,set()),'Geographic node no longer identifies the expected named junction'
controls=read('src/circuits/europe/monaco-rocher-controls-2026.json')
refpath=ROOT/'src/circuits/season-review/monaco-rocher-geographic-reference.json';ref=read(str(refpath.relative_to(ROOT)))
assert controls['circuitId']==data['circuitId']=='monaco' and controls['season']==data['season']==2026
assert controls['sourceImageSha256']==public['sourceSha256']
assert controls['referenceReportSha256']==hashlib.sha256(refpath.read_bytes()).hexdigest()
assert controls['osmReferenceSha256']==retrieval['sha256']
assert ref['sourceCrs']=='EPSG:3857' and ref['zoom']==17 and ref['tileSize']==256
assert len(controls['controls'])==4 and not controls['independentControlCheckAccepted']
a=np.array(alignment['basisPixels']);b=np.array(alignment['publicPixels'])
matrix=np.array([[x,-y,1,0] for x,y in a]+[[y,x,0,1] for x,y in a])
sc,rot,dx,dy=np.linalg.lstsq(matrix,np.r_[b[:,0],b[:,1]],rcond=None)[0]
inverse=np.linalg.inv(np.array([[sc,-rot,dx],[rot,sc,dy],[0,0,1]]))
pixels=list(road.pixels);world=list(road.world);annotated=[]
x0,y0=ref['topLeftTile'];n=256*2**ref['zoom']
for control in controls['controls']:
    x,y=control['referencePixel'];gx=x0*256+x;gy=y0*256+y
    if control.get('osmNodeId'):
        assert control['osmNodeId'] in nodes and control['coordinateSource']['url']=='https://www.openstreetmap.org/node/'+control['osmNodeId']
        coordinate=np.array(nodes[control['osmNodeId']])
    else:coordinate=np.array([gx/n*360-180,math.degrees(math.atan(math.sinh(math.pi*(1-2*gy/n))))])
    pixels.append((inverse@np.r_[control['sourcePixel'],1])[:2]);world.append((coordinate-o)*factor)
    annotated.append({**control,'coordinate':coordinate.tolist()})
pixels=np.array(pixels);world=np.array(world);tri=Delaunay(pixels)
def warp_basis(p):
    k=int(tri.find_simplex(p))
    assert k>=0,'Public outline requires extrapolation; add independent controls'
    ids=tri.simplices[k];x=np.c_[pixels[ids],np.ones(3)];y=np.c_[world[ids],np.ones(3)]
    assert np.linalg.det(x)*np.linalg.det(y)>0,'Folded registration triangle'
    return np.r_[p,1]@np.linalg.solve(x,world[ids])

def warp(point):
    return warp_basis((inverse@np.r_[point,1])[:2])

def validate_basis_polygon(poly):
    assert poly.is_valid
    for p in poly.exterior.coords:warp_basis(np.array(p))
    for ids in tri.simplices:
        if Polygon(pixels[ids]).intersection(poly).area>1e-9:
            assert np.linalg.det(np.c_[pixels[ids],np.ones(3)])*np.linalg.det(np.c_[world[ids],np.ones(3)])>0,'Interior mapping folds'
