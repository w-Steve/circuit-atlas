"""Final-2026 GE7–GE13 outer bank candidate; no runtime mutation."""
import copy
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.interpolate import CubicSpline, PchipInterpolator, splprep, splev
from scipy.ndimage import map_coordinates
from scipy.optimize import minimize_scalar
from shapely.geometry import Polygon
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
read = lambda p: json.loads((ROOT/p).read_text('utf8'))
image = ROOT/'research/season-review/madrid2026/map-xl.webp'
sha = hashlib.sha256(image.read_bytes()).hexdigest()
assert sha=='99ac1e3d5f822f0b650da0f727956c7f8c7d64c9616327f4cfc0cedebacaf241'
pixels = np.asarray(Image.open(image).convert('RGB'),dtype=float)
d,m = read('src/circuits/generated/madrid.json'),read('artifacts/goal-review/madrid-main/metric.json')
assert m['inputs']=={k:d[k] for k in ['trackGeometry','corners','elevation']}
# Source image coordinates follow the visible road, not a fabricated track.
# The T11/T13 printed-number occlusions require estimated anchor locations.
pilot = np.array([[954,203],[980,202],[1000,192],[1020,183],[1040,178],[1060,181],[1075,190],[1088,207],[1092,222],[1091,240],[1083,257],[1070,268],[1052,279],[1030,287],[1008,289],[987,286],[965,276],[940,260],[915,241],[891,222],[868,205],[848,198]],dtype=float)
pilot_arc = np.r_[0,np.cumsum(np.linalg.norm(np.diff(pilot,axis=0),axis=1))]
anchor_s = pilot_arc[[0,8,-1]]
observed = []
offsets = np.arange(-14,14.01,.5)
for s in np.arange(4,pilot_arc[-1]-3,4):
    p = np.array([np.interp(s,pilot_arc,pilot[:,axis]) for axis in [0,1]])
    if min(np.linalg.norm(p-q) for q in [[954,203],[1075,190],[850,187]])<11:continue
    k = min(len(pilot)-2,max(0,np.searchsorted(pilot_arc,s)-1))
    tangent = pilot[k+1]-pilot[k]
    normal = np.array([-tangent[1],tangent[0]])/np.linalg.norm(tangent)
    positions = p+offsets[:,None]*normal
    rgb = np.array([map_coordinates(pixels[:,:,channel],[positions[:,1],positions[:,0]],order=1) for channel in range(3)]).T
    dark = np.all(rgb<85,axis=1)
    runs,start = [],None
    for i,v in enumerate(np.r_[dark,False]):
        if v and start is None:start=i
        if not v and start is not None:
            if 5<=(i-start)*.5<=20:runs.append(float((offsets[start]+offsets[i-1])/2))
            start=None
    if runs:
        offset=min(runs,key=abs)
        if abs(offset)<8 and min(abs(s-a) for a in anchor_s)>1:observed.append((s,*(p+offset*normal)))
samples = sorted([*observed,*[(float(s),*p) for s,p in zip(anchor_s,pilot[[0,8,-1]])]],key=lambda q:q[0])
assert len(samples)>40
samples = np.array(samples)
tck,_ = splprep(samples[:,1:].T,u=samples[:,0],s=len(samples)*.5**2)
source = lambda s:np.asarray(splev(s,tck)).T
source_tangent = lambda s:np.asarray(splev(s,tck,der=1)).T
dense_s = np.linspace(samples[0,0],samples[-1,0],4000)
dense = source(dense_s)
source_arc = np.r_[0,np.cumsum(np.linalg.norm(np.diff(dense,axis=0),axis=1))]
o = np.array(m['origin'])
factor = np.array([111320*math.cos(math.radians(o[1])),-111320])*m['calibration']
road = np.array(m['road'])[:,[0,2]]
corners = {c['number']:c['coordinate'] for c in d['corners']}
i,j = [int(np.argmin(np.linalg.norm(road-(np.array(corners[n])-o)*factor,axis=1))) for n in [11,13]]
step = 1 if (j-i)%len(road)<(i-j)%len(road) else -1
target = np.array([road[(i+k*step)%len(road)] for k in range(min((j-i)%len(road),(i-j)%len(road))+1)])
target_arc = np.r_[0,np.cumsum(np.linalg.norm(np.diff(target,axis=0),axis=1))]
target_mid = float(target_arc[np.argmin(np.linalg.norm(target-(np.array(corners[12])-o)*factor,axis=1))])
assert 0<target_mid<target_arc[-1]
curve = CubicSpline(target_arc,target,axis=0)
source_mid = float(np.interp(anchor_s[1],dense_s,source_arc))
arc_map = PchipInterpolator([0,source_mid,source_arc[-1]],[0,target_mid,target_arc[-1]])
assert np.min(arc_map.derivative()(source_arc))>0

def warp(p):
    index = int(np.argmin(np.linalg.norm(dense-p,axis=1)))
    lo,hi = dense_s[max(0,index-3)],dense_s[min(len(dense_s)-1,index+3)]
    s = minimize_scalar(lambda s:np.linalg.norm(source(s)-p)**2,bounds=(lo,hi),method='bounded').x
    tangent = source_tangent(s)
    normal = np.array([-tangent[1],tangent[0]])/np.linalg.norm(tangent)
    side = np.dot(np.asarray(p)-source(s),normal)
    a = np.interp(s,dense_s,source_arc)
    world_s = float(arc_map(a))
    direction = curve(world_s,1)
    return curve(world_s)+np.array([-direction[1],direction[0]])/np.linalg.norm(direction)*side*float(arc_map.derivative()(a))

front_pixels = [[1086,189],[1091,197],[1094,204],[1098,216],[1100,228],[1100,237],[1098,249]]
back_pixels = [[1092,186],[1099,195],[1105,210],[1107,222],[1107,232],[1106,246],[1104,250]]

def edge(points):
    points=np.array(points)
    arc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(points,axis=0),axis=1))]
    values=np.linspace(0,arc[-1],110)
    return np.array([warp(p) for p in np.c_[np.interp(values,arc,points[:,0]),np.interp(values,arc,points[:,1])]])

front,back = edge(front_pixels),edge(back_pixels)
for k in range(len(front)-1):
    q=np.array([front[k],front[k+1],back[k+1],back[k]])
    v=np.roll(q,-1,axis=0)-q
    w=np.roll(v,-1,axis=0)
    turns=v[:,0]*w[:,1]-v[:,1]*w[:,0]
    assert np.min(abs(turns))>1e-8 and np.all(turns*turns[0]>0),f'Folded span {k}'
boundary=np.r_[front,back[::-1],front[:1]]
shape=Polygon(boundary)
roads=unary_union([Polygon(t) for t in m['triangles']])
assert shape.is_valid and shape.intersection(roads).area<1e-6,'Invalid or road-intersecting source bank'
others=[]
for z in d['spectatorZones']:
    if z['zoneId']=='monumental':continue
    for s in z['surfaces']:
        area=shape.intersection(Polygon((np.array(s['boundary'])-o)*factor)).area
        if area>1e-6:others.append({'zoneId':z['zoneId'],'availability':z['availability'],'areaMetres2':area})
assert not any(x['availability']=='available' for x in others)
path=ROOT/'src/circuits/europe/madrid-ge7-2026.json'
previous=read(path) if path.exists() else None
old=previous['oldZone'] if previous else next(z for z in d['spectatorZones'] if z['zoneId']=='monumental')
zone=copy.deepcopy(old)
url='https://www.madring.com/img/xl/mapa-madring/mapa_web_11_8_26_ing.webp'
provenance={'url':url,'checkedAt':'2026-10-27','method':'estimated','confidence':'low','notes':'Final2026 GE7–GE13 visible outer bank. Rear edge continued across the live-screen pictogram; straight end caps estimated about 1–2px. Observed T11–T13 black-road medials and T12 arc correspondence; no clearance/photo fitting. Grouped envelope does not establish individual ticket cross-access.'}
depth=float(np.min(np.linalg.norm(front-back,axis=1)))
rows=max(5,int(depth/.85))
rise=round((rows-1)*.4,2)
center=(front.mean(axis=0)+back.mean(axis=0))/2
reference=target[np.argmin(np.linalg.norm(target-center,axis=1))]
zone.update(name='GE7–GE13 看台',availability='preparing',boundary=(o+boundary/factor).tolist(),admissionNote='图示为合并观赛范围，不代表单张门票可跨分区通行。')
zone['surfaces'][0].update(boundary=zone['boundary'],rows=rows,rise=rise,frontReference=(o+reference/factor).tolist(),rowBearing='local-normal',rowStrip={'front':(o+front/factor).tolist(),'back':(o+back/factor).tolist(),'source':provenance})
zone['surface'].update(depth=round(depth,2),rise=rise)
zone.update(boundarySource=provenance,openingSource=provenance,surfaceSource={**provenance,'notes':'Minimum mapped depth / 0.85m spacing, 0.4m row rise; original 3.2m platform and 1.2m seated eye retained. No surveyed stand section.'},geometryReview={'checkedAt':'2026-10-27','issues':['Candidate shared-engine mesh and three-viewport scene acceptance pending.'],'method':'Visible outer-bank envelope and observed road-arc registration.'})
if previous:
    structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
    if structure(zone)==structure(previous['zone']):
        zone['availability']=previous['zone']['availability']
        zone['geometryReview']=previous['zone']['geometryReview']
report={'circuitId':'madrid','season':2026,'sourceUrl':url,'sourceSha256':sha,'geometryFingerprint':hashlib.sha256(json.dumps({k:d[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),'sourceRoadSamples':samples.tolist(),'estimatedCornerAnchors':{'11':[954,203],'12':[1092,222],'13':[848,198]},'roadCornerNumbers':[11,12,13],'sourceRoadFitRmsPixels':float(np.sqrt(np.mean(np.sum((source(samples[:,0])-samples[:,1:])**2,axis=1)))),'sourceFrontPixels':front_pixels,'sourceBackPixels':back_pixels,'minimumDepthMetres':depth,'roadIntersectionMetres2':shape.intersection(roads).area,'roadClearanceMetres':shape.distance(roads),'otherIntersections':others,'unmodeledFacility':{'symbol':'live-screen','sourceBox':[1107,232,1120,246],'boundary':None,'heightMetres':None},'zone':zone,'oldZone':old,'inventoryComplete':False}
if previous and zone['availability']=='available' and 'sceneAcceptance' in previous:report['sceneAcceptance']=previous['sceneAcceptance']
path.write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(json.dumps({k:report[k] for k in ['sourceRoadFitRmsPixels','minimumDepthMetres','roadIntersectionMetres2','roadClearanceMetres','otherIntersections']}))
