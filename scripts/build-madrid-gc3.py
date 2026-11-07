"""Final-2026 source-bank candidate; --bank=ge24/gk/ge1, default gc3. No runtime writes."""
import copy
import hashlib
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.interpolate import CubicSpline, UnivariateSpline, PchipInterpolator, RBFInterpolator
from scipy.optimize import minimize_scalar
from shapely.geometry import Polygon, MultiPoint
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
bank = next((a.split('=',1)[1] for a in sys.argv[1:] if a.startswith('--bank=')),'gc3')
assert bank in ['gc3','ge24','gk','ge1'], 'Unknown source bank'
ge24 = bank=='ge24'
gk = bank=='gk'
ge1 = bank=='ge1'
checked_at = '2026-10-27' if ge1 else '2026-10-26'
zone_id = {'gc3':'t4t5','ge24':'stand-7','gk':'stand-8','ge1':'t11'}[bank]
bank_name = {'gc3':'GC3–GC5','ge24':'GE24','gk':'GK1–GK2','ge1':'GE1–GE3'}[bank]
corner_numbers = {'gc3':[4,5],'ge24':[15,14],'gk':[8,9],'ge1':[9,12]}[bank]
limits = {'gc3':(448,577),'ge24':(679,779),'gk':(783,828),'ge1':(828,1092)}[bank]
read = lambda path: json.loads((ROOT/path).read_text('utf8'))
image = ROOT/'research/season-review/madrid2026/map-xl.webp'
sha = hashlib.sha256(image.read_bytes()).hexdigest()
assert sha == '99ac1e3d5f822f0b650da0f727956c7f8c7d64c9616327f4cfc0cedebacaf241'
d, m = read('src/circuits/generated/madrid.json'), read('artifacts/goal-review/madrid-main/metric.json')
assert m['inputs'] == {k:d[k] for k in ['trackGeometry','corners','elevation']}
pixels = np.asarray(Image.open(image).convert('RGB'))
samples = {'gc3':[[448.,185.]],'ge24':[[679.,277.]],'gk':[[783.,178.]],'ge1':[[828.,158.],[921.,165.],[954.,203.]]}[bank]
for x in range(*{'gc3':(453,568,4),'ge24':(684,775,4),'gk':(791,821,2),'ge1':(840,1089,4)}[bank]):
    if ge1 and (911<=x<=931 or 944<=x<=965 or 1065<=x<=1085):continue  # printed corner labels hide the road
    expected = np.interp(x,[783,805,828],[178,170,157]) if gk else np.interp(x,[679,700,730,760,779],[277,266,262,261,259]) if ge24 else np.interp(x,[448,480,520,550,577],[185,187,195,206,214])
    if ge1:expected = np.interp(x,[828,850,880,900,921,930,950,970,990,1010,1030,1050,1070,1088,1092],[158,157,157,158,165,175,198,202,196,187,179,179,186,208,222])
    lo, hi = int(expected)-14, int(expected)+15
    dark = np.all(pixels[lo:hi,x,:] < 85,axis=1)
    runs, start = [], None
    for i,v in enumerate(np.r_[dark,False]):
        if v and start is None:start = i
        if not v and start is not None:
            if 5 <= i-start <= 20:runs.append(lo+(start+i-1)/2)
            start = None
    if runs:
        y = min(runs,key=lambda y:abs(y-expected))
        if abs(y-expected)<8:samples.append([x,y])
samples.append({'gc3':[577.,214.],'ge24':[779.,259.],'gk':[828.,157.],'ge1':[1092.,222.]}[bank])
samples.sort(key=lambda p:p[0])
samples = np.array(samples)
spl = UnivariateSpline(samples[:,0],samples[:,1],s=len(samples)*.5**2)
sx = np.linspace(*limits,2000)
sp = np.c_[sx,spl(sx)]
sl = np.r_[0,np.cumsum(np.linalg.norm(np.diff(sp,axis=0),axis=1))]
o = np.array(m['origin'])
factor = np.array([111320*math.cos(math.radians(o[1])),-111320])*m['calibration']
road = np.array(m['road'])[:,[0,2]]
corners = {c['number']:c['coordinate'] for c in d['corners']}
i,j = [int(np.argmin(np.linalg.norm(road-(np.array(corners[n])-o)*factor,axis=1))) for n in corner_numbers]
step = 1 if (j-i)%len(road)<(i-j)%len(road) else -1
target = np.array([road[(i+k*step)%len(road)] for k in range(min((j-i)%len(road),(i-j)%len(road))+1)])
tl = np.r_[0,np.cumsum(np.linalg.norm(np.diff(target,axis=0),axis=1))]
curve = CubicSpline(tl,target,axis=0)
scale = tl[-1]/sl[-1]
arc_map = None
if ge1:
    source_ten = float(np.interp(921,sx,sl))
    target_ten = float(tl[np.argmin(np.linalg.norm(target-(np.array(corners[10])-o)*factor,axis=1))])
    source_mid = float(np.interp(954,sx,sl))
    target_mid = float(tl[np.argmin(np.linalg.norm(target-(np.array(corners[11])-o)*factor,axis=1))])
    assert 0<target_ten<target_mid<tl[-1]
    arc_map = PchipInterpolator([0,source_ten,source_mid,sl[-1]],[0,target_ten,target_mid,tl[-1]])
    assert np.min(arc_map.derivative()(sl))>0, 'Non-monotonic corner correspondence'
    source_controls = np.c_[samples[:,0],spl(samples[:,0])]
    target_controls = curve(arc_map(np.interp(samples[:,0],sx,sl)))
    plane_map = RBFInterpolator(source_controls,target_controls,kernel='thin_plate_spline')

def warp(p):
    if ge1:
        # A closest-normal projection is non-unique inside this bend. Fit a
        # continuous 2D field to road correspondences only, not photo visibility
        # or bank/road clearance. Reject any folded strip below before applying.
        return plane_map(np.asarray(p,dtype=float).reshape(1,2))[0]
    x = minimize_scalar(lambda x:(x-p[0])**2+(spl(x)-p[1])**2,bounds=limits,method='bounded').x
    q = np.array([x,spl(x)])
    v = np.array([1,spl(x,1)])
    side = np.dot(p-q,[-v[1],v[0]])/np.linalg.norm(v)
    source_arc = np.interp(x,sx,sl)
    a = float(arc_map(source_arc)) if arc_map is not None else source_arc/sl[-1]*tl[-1]
    lateral_scale = float(arc_map.derivative()(source_arc)) if arc_map is not None else scale
    tangent = curve(a,1)
    return curve(a)+np.array([-tangent[1],tangent[0]])/np.linalg.norm(tangent)*side*lateral_scale

# Visible orange outline; left stairs pictogram and rounded ends are not cuts
# in the spectator bank. End caps are straight estimates (about 1–2 source px).
front_pixels = [[477,177],[500,178],[519,181],[545,188],[563,196],[566,196]]
back_pixels = [[477,168],[489,169],[503,170],[510,170],[531,174],[556,182],[567,187]]
if ge24:
    front_pixels = [[724,254],[733,254],[746,254],[757,253]]
    back_pixels = [[724,240],[733,239],[747,239],[757,240]]
if gk:
    front_pixels = [[790,169],[804,163],[818,154]]
    back_pixels = [[784,160],[799,152],[814,145]]
if ge1:
    front_pixels = [[929,165],[943,181],[957,190],[973,193],[997,188]]
    back_pixels = [[934,157],[948,169],[962,179],[977,183],[994,178]]

def edge(points):
    points = np.array(points)
    arc = np.r_[0,np.cumsum(np.linalg.norm(np.diff(points,axis=0),axis=1))]
    a = np.linspace(0,arc[-1],110)
    return np.c_[np.interp(a,arc,points[:,0]),np.interp(a,arc,points[:,1])]

front, back = np.array([warp(p) for p in edge(front_pixels)]), np.array([warp(p) for p in edge(back_pixels)])
if ge1:
    for index in range(len(front)-1):
        quad = np.array([front[index],front[index+1],back[index+1],back[index]])
        edges = np.roll(quad,-1,axis=0)-quad
        following = np.roll(edges,-1,axis=0)
        turns = edges[:,0]*following[:,1]-edges[:,1]*following[:,0]
        assert np.min(abs(turns))>1e-8 and np.all(turns*turns[0]>0), f'Folded source seating span {index}'
boundary = np.r_[front,back[::-1],front[:1]]
shape = Polygon(boundary)
roads = unary_union([Polygon(t) for t in m['triangles']])
assert shape.is_valid, 'Folded bank'
assert shape.intersection(roads).area < 1e-6, 'Source-bank registration intersects road'
intersections = []
for zone in d['spectatorZones']:
    if zone['zoneId']==zone_id:continue
    for surface in zone['surfaces']:
        area = shape.intersection(Polygon((np.array(surface['boundary'])-o)*factor)).area
        if area>1e-6:intersections.append({'zoneId':zone['zoneId'],'availability':zone['availability'],'areaMetres2':area})
assert not any(x['availability']=='available' for x in intersections), 'Source-bank registration intersects an available bank'
path = ROOT/f'src/circuits/europe/madrid-{bank}-2026.json'
previous = read(path) if path.exists() else None
old = previous['oldZone'] if previous else next(z for z in d['spectatorZones'] if z['zoneId']==zone_id)
zone = copy.deepcopy(old)
url = 'https://www.madring.com/img/xl/mapa-madring/mapa_web_11_8_26_ing.webp'
provenance = dict(url=url,checkedAt=checked_at,method='estimated',confidence='low',notes='Final2026 visible GC3–GC5 outline; stairs icon is not a boundary notch. Straight end-cap estimates about 1–2px. Road registration uses observed black-road sections and T4–T5 GIS arc; not fitted to clearance or visibility.')
if ge24:provenance['notes']='Final2026 visible GE24 seated bank, not the neighbouring eye-symbol General Admission or striped Fan Zone. End-cap/outline estimates about 1–2px. Observed black-road sections and T15–T14 GIS arc registration; not fitted to clearance or visibility.'
if gk:provenance['notes']='Final2026 GK1–GK2 seated envelope and stairs pictogram; no footprint inferred from the neighbouring services or wheelchair symbol. Visible front/back edges and straight end caps estimated about 1–2px. Observed T8–T9 black-road sections with GIS arc registration; not fitted to clearance or visibility.'
if ge1:provenance['notes']='Final2026 GE1–GE3 visible curved bank. Right end edges continued across the wheelchair pictogram from visible endpoints; individual platform is not reconstructed. Observed T9–T12 road medials including the neighbouring T9–T10 straight, estimated obscured corner anchors and visible east-apex T12 road pixel; monotonic corner arc correspondence and a 2D thin-plate interpolant anchored only to those road correspondences. Not fitted to clearance or photos. Outline/end-cap estimates about 1–2px outside the icon occlusion.'
depth = float(np.min(np.linalg.norm(front-back,axis=1)))
rows = max(5,int(depth/.85))
rise = round((rows-1)*.4,2)
centre = (front.mean(axis=0)+back.mean(axis=0))/2
nearest = minimize_scalar(lambda a:np.linalg.norm(curve(a)-centre)**2,bounds=(0,tl[-1]),method='bounded').x
zone.update(name=bank_name+' 看台',boundary=(o+boundary/factor).tolist(),availability='preparing')
zone['surfaces'][0].update(boundary=zone['boundary'],rows=rows,rise=rise,frontReference=(o+curve(nearest)/factor).tolist(),rowStrip={'front':(o+front/factor).tolist(),'back':(o+back/factor).tolist(),'source':provenance})
if ge1:
    zone['surfaces'][0]['rowBearing']='local-normal'
    zone['admissionNote']='图示范围含无障碍设施，局部平台未单独还原。'
zone['surface'].update(depth=round(depth,2),rise=rise)
zone.update(boundarySource=provenance,openingSource=provenance,surfaceSource={**provenance,'notes':'Rows estimated from minimum mapped depth / 0.85m spacing and 0.4m row rise. Original 3.2m platform and 1.2m seated eye retained; no surveyed section.'},geometryReview={'checkedAt':checked_at,'issues':['Candidate: seated mesh, orientation and three-viewport scene acceptance pending.'],'method':'Observed final source outline and road-centre arc registration.'})
if previous:
    structure = lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
    if structure(previous['zone']) == structure(zone):
        zone['availability'] = previous['zone']['availability']
        zone['geometryReview'] = previous['zone']['geometryReview']
report = dict(circuitId='madrid',season=2026,sourceUrl=url,sourceSha256=sha,geometryFingerprint=hashlib.sha256(json.dumps({k:d[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),sourceRoadPixels=samples.tolist(),roadCornerNumbers=corner_numbers,sourceRoadFitRmsPixels=float(np.sqrt(np.mean((spl(samples[:,0])-samples[:,1])**2))),metresPerPixel=float(scale),sourceFrontPixels=front_pixels,sourceBackPixels=back_pixels,minimumDepthMetres=depth,roadIntersectionMetres2=shape.intersection(roads).area,roadClearanceMetres=shape.distance(roads),otherIntersections=intersections,zone=zone,oldZone=old,inventoryComplete=False)
if ge24:
    report['previousMisidentification']={'sourcePixelCentre':[689,214],'classification':'Fan Zone Distrito activity space, not a seated-bank footprint. Legacy stand-7 ID is migrated to the separately identified GE24 bank; the original object is preserved in oldZone.'}
    report['unmodeledAdjacentPublicAreas']=[{'kind':'general-admission','sourceEyePixel':pixel,'boundary':None,'limitation':'Eye icon establishes viewing-area type only. Exact boundary and finished ground/platform profile remain unavailable; do not use the whole striped Fan Zone.'} for pixel in [[710,247],[770,245]]]
if gk:report['unmodeledAdjacentAccessibleFacility']={'sourceWheelchairPixel':[828,144],'boundary':None,'heightMetres':None,'limitation':'Adjacent wheelchair pictogram is not a surveyed platform footprint or an admission entitlement. The modeled envelope is the visible seated bank only.'}
if ge1:
    report['middleCornerCorrespondence']={'corner':11,'sourcePixel':[954,203],'sourceArcPixels':source_mid,'targetArcMetres':target_mid,'worldResidualMetres':float(np.linalg.norm(warp([954,203])-curve(target_mid))),'lateralScaleRangeMetresPerPixel':[float(np.min(arc_map.derivative()(sl))),float(np.max(arc_map.derivative()(sl)))]}
    report['boundaryOcclusions']=[{'sourceBox':[979,178,992,192],'symbol':'wheelchair','handling':'Continue visible bank edges, with no individual platform boundary, height or accessibility simulation claim.'}]
    source_bank = Polygon(front_pixels+back_pixels[::-1])
    report['registrationSupport']={'roadControlCount':len(source_controls),'outsideControlHullFraction':source_bank.difference(MultiPoint(source_controls).convex_hull).area/source_bank.area,'limitation':'Road-controlled illustrative registration, including limited extrapolation; not an independently surveyed grandstand footprint. The estimated corner-label residual is not geographic accuracy.'}
if previous and 'sceneAcceptance' in previous and zone['availability']=='available':report['sceneAcceptance']=previous['sceneAcceptance']
path.write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
print(json.dumps({k:report[k] for k in ['sourceRoadFitRmsPixels','metresPerPixel','minimumDepthMetres','roadIntersectionMetres2','roadClearanceMetres','otherIntersections']}))
