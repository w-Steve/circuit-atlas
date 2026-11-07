"""T1-T3 ordinary envelope: retain full red region, exclude the explicit VIP band.
Source-only build; no runtime writes or automatic scene acceptance.
"""
from monaco_road_registration import ROOT,read,data,metric,alignment,public,drawings,worldRoad,o,factor,np,Polygon,Point,LineString,unary_union,hashlib,json,copy
import monaco_public_registration as registration
from scipy.interpolate import RBFInterpolator

T_PATH=5572;VIP_PATH=5631;SCALE=alignment['basisScale']
capDeviation=0.;seamRadius=0.;flattenDeviation=0.
def cubic(points,t):
    a,b,c,d=points;return (1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d
def flatten(points):
    a,b,c,d=points;line=LineString([a,d])
    if max(line.distance(Point(b)),line.distance(Point(c)))<=.01:return [a,d]
    ab=(a+b)/2;bc=(b+c)/2;cd=(c+d)/2;abc=(ab+bc)/2;bcd=(bc+cd)/2;mid=(abc+bcd)/2
    return flatten(np.array([a,ab,abc,mid]))[:-1]+flatten(np.array([mid,bcd,cd,d]))
def polygon(index):
    global capDeviation,seamRadius,flattenDeviation
    drawing=drawings[index];assert [it[0] for it in drawing['items']]==['c']*7
    result=[]
    for i,item in enumerate(drawing['items']):
        points=np.array(item[1:])*SCALE;dense=[cubic(points,t) for t in np.linspace(0,1,201)]
        if i==2:
            assert np.linalg.norm(points[0]-points[-1])<1e-8
            radius=max(np.linalg.norm(p-points[0]) for p in dense);assert radius<.1
            seamRadius=max(seamRadius,radius);continue
        if i in [3,6]:
            line=LineString([points[0],points[-1]]);deviation=max(line.distance(Point(p)) for p in dense)
            assert deviation<.1;capDeviation=max(capDeviation,deviation);result.extend([points[0],points[-1]])
        else:
            flat=flatten(points);line=LineString(flat);deviation=max(line.distance(Point(p)) for p in dense)
            assert deviation<.01;flattenDeviation=max(flattenDeviation,deviation);result.extend(flat)
    poly=Polygon(result);assert poly.is_valid and poly.area>0;return poly

outer=polygon(T_PATH);vip=polygon(VIP_PATH);ordinary=outer.difference(vip)
assert ordinary.geom_type=='Polygon' and ordinary.is_valid and not ordinary.interiors
assert ordinary.intersection(vip).area<1e-9
assert abs(ordinary.area+outer.intersection(vip).area-outer.area)<1e-7,'Ordinary region lost a source cap'
for point in ordinary.exterior.coords:assert registration.tri.find_simplex(point)>=0,'No geographic extrapolation'
center=registration.pixels.mean(0);normalization=np.ptp(registration.pixels,axis=0).max()
rbf=RBFInterpolator((registration.pixels-center)/normalization,registration.world,kernel='thin_plate_spline',smoothing=0,degree=1)
warp=lambda points:rbf((np.array(points)-center)/normalization)
residual=float(np.max(np.linalg.norm(warp(registration.pixels)-registration.world,axis=1)));assert residual<1e-6
samples=list(ordinary.exterior.coords);x0,y0,x1,y1=ordinary.bounds
samples.extend((x,y) for x in np.arange(x0,x1,1) for y in np.arange(y0,y1,1) if ordinary.covers(Point(x,y)))
samples=np.array(samples);h=.01
dx=(warp(samples+[h,0])-warp(samples-[h,0]))/(2*h);dy=(warp(samples+[0,h])-warp(samples-[0,h]))/(2*h)
det=dx[:,0]*dy[:,1]-dx[:,1]*dy[:,0];assert np.all(det>0),'TPS Jacobian folds inside T'
world=Polygon(warp(ordinary.exterior.coords));vipWorld=Polygon(warp(vip.exterior.coords))
assert world.is_valid and vipWorld.is_valid and world.intersection(vipWorld).area<1e-7
roads=unary_union([Polygon(t) for t in metric['triangles']]);assert world.intersection(roads).area<1e-6
other=[]
for z in data['spectatorZones']:
    if z['zoneId']=='t-rascasse':continue
    for surface in z['surfaces']:
        area=world.intersection(Polygon((np.array(surface['boundary'])-o)*factor)).area
        if area>1e-6:other.append({'zoneId':z['zoneId'],'availability':z['availability'],'areaMetres2':area})
assert not any(i['availability']=='available' for i in other)
front=np.concatenate([np.array([cubic(np.array(drawings[T_PATH]['items'][i][1:])*SCALE,t) for t in np.linspace(0,1,101)]) for i in [4,5]])
back=np.concatenate([np.array([cubic(np.array(drawings[VIP_PATH]['items'][i][1:])*SCALE,t) for t in np.linspace(0,1,101)]) for i in [4,5]])
depth=float(np.min(np.linalg.norm(warp(front)-warp(back),axis=1)));rows=max(2,int(depth/.85));rise=round((rows-1)*.4,2)
target=ROOT/'src/circuits/europe/monaco-t-2026.json';previous=read(str(target.relative_to(ROOT))) if target.exists() else None
old=previous['oldZone'] if previous else next(z for z in data['spectatorZones'] if z['zoneId']=='t-rascasse');zone=copy.deepcopy(old)
evidence={'url':public['sourceUrl'],'checkedAt':'2026-10-27','method':'estimated','confidence':'low','notes':'Official T1-T3 ordinary red envelope minus explicit Loges VIP vector band. Exact-control TPS with fixed road/junction targets; no road clipping or photograph fitting. Geographic correspondence and row profile remain approximate.'}
boundary=(o+np.array(world.exterior.coords)/factor).tolist();reference=worldRoad.interpolate(worldRoad.project(world.centroid))
zone.update(name='T1–T3 · 船台看台',availability='preparing',boundary=boundary,source=evidence,boundarySource=evidence,openingSource={**evidence,'method':'extracted','confidence':'medium','notes':'Official2026 public map labels T1-T3 and a separate Loges VIP band. Ordinary envelope only; one ticket does not imply cross-section access.'},surfaceSource={**evidence,'notes':'Minimum mapped ordinary-band depth /0.85m tread and0.4m rise; retain original platform and1.2m seated eye. Not surveyed.'},admissionNote='当前为图示前侧观众区；单票不代表可跨分区通行。',geometryReview={'checkedAt':'2026-10-27','issues':['Shared mesh, end-cap geometry and three-viewport scene acceptance pending.'],'method':'VIP-excluded official source envelope, fixed-target thin-plate spline; no extrapolation.'})
surface=zone['surfaces'][0];surface.update(boundary=boundary,rows=rows,rise=rise,rowBearing='local-normal',frontReference=(o+np.array(reference.coords)[0]/factor).tolist());surface.pop('rowStrip',None)
zone['surface'].update(depth=depth,rise=rise)
if previous:
    structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
    if structure(zone)==structure(previous['zone']):zone['availability']=previous['zone']['availability'];zone['geometryReview']=previous['zone']['geometryReview']
probe=warp([vip.representative_point().coords[0]])[0];assert not world.covers(Point(probe))
record={'circuitId':'monaco','season':2026,'sourceUrl':public['sourceUrl'],'sourceSha256':public['sourceSha256'],'basisPdfSha256':alignment['basisPdfSha256'],'sourcePathIndex':T_PATH,'excludedVipPathIndex':VIP_PATH,
    'sourceOperators':[[it[0],*[list(p) for p in it[1:]]] for it in drawings[T_PATH]['items']],'excludedVipOperators':[[it[0],*[list(p) for p in it[1:]]] for it in drawings[VIP_PATH]['items']],
    'sourceOrdinaryBoundaryBasisPixels':[list(p) for p in ordinary.exterior.coords],'sourceVipBoundaryBasisPixels':[list(p) for p in vip.exterior.coords],
    'sourceOuterAreaPixels2':outer.area,'sourceOrdinaryAreaPixels2':ordinary.area,'sourceExcludedVipAreaPixels2':outer.intersection(vip).area,'sourceVipIntersectionPixels2':ordinary.intersection(vip).area,
    'sourceCapStraighteningMaxDeviationPixels':capDeviation,'sourceSeamLoopMaxRadiusPixels':seamRadius,'sourceCurveFlatteningMaxDeviationPixels':flattenDeviation,
    'geometryFingerprint':hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),
    'registration':{'method':'Thin-plate spline, degree1, zero smoothing; same fixed road/geographic controls as public registration. Interior1-basis-pixel grid plus boundary Jacobian samples.','controlsSha256':hashlib.sha256((ROOT/'src/circuits/europe/monaco-rocher-controls-2026.json').read_bytes()).hexdigest(),'controlResidualMetres':residual,'jacobianSampleCount':len(samples),'minimumSampledJacobian':float(det.min()),'limits':'Internal interpolation residual and sampled Jacobian are not geographic survey accuracy or an analytic proof for every point.'},
    'roadWidthMetres':data['trackGeometry']['widthMetres'],'minimumDepthMetres':depth,'roadIntersectionMetres2':world.intersection(roads).area,'roadClearanceMetres':world.distance(roads),'vipWorldIntersectionMetres2':world.intersection(vipWorld).area,'vipInteriorProbeCoordinate':(o+probe/factor).tolist(),
    'otherIntersections':other,'oldCurrentRoadIntersectionMetres2':Polygon((np.array(old['boundary'])-o)*factor).intersection(roads).area,'oldZone':old,'zone':zone,'inventoryComplete':False}
record['coverageScope']={'modeled':'Visible ordinary front band of the2D public map','completeOrdinaryCoverage':False,'requiredReview':'src/circuits/season-review/monaco-annual-ticket-source-review.json'}
if previous and zone['availability']=='available' and previous.get('sceneAcceptance'):record['sceneAcceptance']=previous['sceneAcceptance']
if previous and zone==previous['zone'] and previous.get('candidateReview'):record['candidateReview']=previous['candidateReview']
target.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(json.dumps({k:record[k] for k in ['minimumDepthMetres','roadIntersectionMetres2','oldCurrentRoadIntersectionMetres2','vipWorldIntersectionMetres2','otherIntersections']}))
