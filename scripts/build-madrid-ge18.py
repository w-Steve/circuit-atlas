"""Final2026 GE18–GE19 / GE20–GE22 / closed GE23 source banks; no runtime mutation."""
import copy,hashlib,json,math,argparse
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.interpolate import CubicSpline,PchipInterpolator,RBFInterpolator,splprep,splev
from scipy.ndimage import map_coordinates
from shapely.geometry import Polygon
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--bank',choices=['ge18','ge20','ge23'],default='ge18');bank=parser.parse_args().bank;ge20=bank=='ge20';ge23=bank=='ge23'
zone_id='t13t14' if ge23 else 't15t16' if ge20 else 't14t15'
label='GE23 看台' if ge23 else 'GE20–GE22 看台' if ge20 else 'GE18–GE19 看台'
corner_numbers=[14,15,16,17] if ge20 else [13,14,15,16]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
raw=ROOT/'research/season-review/madrid2026/map-xl.webp'
sha=hashlib.sha256(raw.read_bytes()).hexdigest()
assert sha=='99ac1e3d5f822f0b650da0f727956c7f8c7d64c9616327f4cfc0cedebacaf241'
pixels=np.asarray(Image.open(raw).convert('RGB'),dtype=float)
d=read('src/circuits/generated/madrid.json');m=read('artifacts/goal-review/madrid-main/metric.json')
assert m['inputs']=={k:d[k] for k in ['trackGeometry','corners','elevation']}
pilot=np.array([[848,198],[831,222],[814,242],[798,253],[778,259],[751,260],[724,260],[699,265],[676,278],[663,300],[655,325],[654,353],[654,387]],dtype=float)
if ge20:pilot=np.array([[778,259],[751,260],[724,260],[699,265],[676,278],[663,300],[655,325],[654,353],[654,387],[657,403],[665,418]],dtype=float)
pa=np.r_[0,np.cumsum(np.linalg.norm(np.diff(pilot,axis=0),axis=1))]
anchor_indices=[0,4,8,10] if ge20 else [0,4,8,12];anchors=pa[anchor_indices]
samples=[]
offsets=np.arange(-14,14.01,.5)
for s in np.arange(3,pa[-1]-2,3):
    p=np.array([np.interp(s,pa,pilot[:,axis]) for axis in [0,1]])
    if min(np.linalg.norm(p-q) for q in pilot[anchor_indices])<11:continue
    k=min(len(pilot)-2,max(0,np.searchsorted(pa,s)-1));v=pilot[k+1]-pilot[k]
    normal=np.array([-v[1],v[0]])/np.linalg.norm(v)
    xy=p+offsets[:,None]*normal
    rgb=np.array([map_coordinates(pixels[:,:,c],[xy[:,1],xy[:,0]],order=1) for c in range(3)]).T
    dark=np.all(rgb<85,axis=1);runs=[];start=None
    for j,on in enumerate(np.r_[dark,False]):
        if on and start is None:start=j
        if not on and start is not None:
            if 5<=(j-start)*.5<=20:runs.append((offsets[start]+offsets[j-1])/2)
            start=None
    if runs:
        offset=min(runs,key=abs)
        if abs(offset)<8:samples.append((s,*(p+offset*normal)))
samples=np.array(sorted([*samples,*[(float(s),*p) for s,p in zip(anchors,pilot[anchor_indices])]],key=lambda a:a[0]))
assert len(samples)>40
tck,_=splprep(samples[:,1:].T,u=samples[:,0],s=len(samples)*.5**2)
ss=np.linspace(0,pa[-1],4000);source=np.asarray(splev(ss,tck)).T
sa=np.r_[0,np.cumsum(np.linalg.norm(np.diff(source,axis=0),axis=1))]
o=np.array(m['origin']);factor=np.array([111320*math.cos(math.radians(o[1])),-111320])*m['calibration']
road=np.array(m['road'])[:,[0,2]];corners={c['number']:c['coordinate'] for c in d['corners']}
indices={n:int(np.argmin(np.linalg.norm(road-(np.array(corners[n])-o)*factor,axis=1))) for n in corner_numbers}
i,j=indices[corner_numbers[0]],indices[corner_numbers[-1]];step=1 if (j-i)%len(road)<(i-j)%len(road) else -1
target=np.array([road[(i+k*step)%len(road)] for k in range(min((j-i)%len(road),(i-j)%len(road))+1)])
ta=np.r_[0,np.cumsum(np.linalg.norm(np.diff(target,axis=0),axis=1))]
target_anchors=[float(ta[np.argmin(np.linalg.norm(target-(np.array(corners[n])-o)*factor,axis=1))]) for n in corner_numbers]
assert all(a<b for a,b in zip(target_anchors,target_anchors[1:]))
arc=PchipInterpolator(np.interp(anchors,ss,sa),target_anchors)
assert np.min(arc.derivative()(sa))>0
curve=CubicSpline(ta,target,axis=0)
controls=np.asarray(splev(samples[:,0],tck)).T
field=RBFInterpolator(controls,curve(arc(np.interp(samples[:,0],ss,sa))),kernel='thin_plate_spline')
adjacent=None
if ge23:
    # The GE23 ribbon lies between two road branches. Include the independently
    # observed T8–T9 branch so its field is supported across the bank, rather
    # than extrapolating the T13–T16 field toward the other side of the venue.
    up=np.array([[783,178],[797,174],[812,167],[828,158]],dtype=float)
    ua=np.r_[0,np.cumsum(np.linalg.norm(np.diff(up,axis=0),axis=1))]
    observed=[]
    for s in np.arange(3,ua[-1]-2,3):
        p=np.array([np.interp(s,ua,up[:,axis]) for axis in [0,1]])
        if min(np.linalg.norm(p-q) for q in up[[0,-1]])<10:continue
        k=min(len(up)-2,max(0,np.searchsorted(ua,s)-1));v=up[k+1]-up[k]
        normal=np.array([-v[1],v[0]])/np.linalg.norm(v);xy=p+offsets[:,None]*normal
        rgb=np.array([map_coordinates(pixels[:,:,c],[xy[:,1],xy[:,0]],order=1) for c in range(3)]).T
        dark=np.all(rgb<85,axis=1);runs=[];start=None
        for j,on in enumerate(np.r_[dark,False]):
            if on and start is None:start=j
            if not on and start is not None:
                if 5<=(j-start)*.5<=20:runs.append((offsets[start]+offsets[j-1])/2)
                start=None
        if runs:
            offset=min(runs,key=abs)
            if abs(offset)<8:observed.append((s,*(p+offset*normal)))
    usamples=np.array(sorted([*observed,(0.,*up[0]),(ua[-1],*up[-1])],key=lambda p:p[0]))
    assert len(usamples)>6
    utck,_=splprep(usamples[:,1:].T,u=usamples[:,0],s=len(usamples)*.5**2)
    us=np.linspace(0,ua[-1],1000);uc=np.asarray(splev(us,utck)).T
    uarc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(uc,axis=0),axis=1))]
    ui,uj=[int(np.argmin(np.linalg.norm(road-(np.array(corners[n])-o)*factor,axis=1))) for n in [8,9]]
    direction=1 if (uj-ui)%len(road)<(ui-uj)%len(road) else -1
    ur=np.array([road[(ui+k*direction)%len(road)] for k in range(min((uj-ui)%len(road),(ui-uj)%len(road))+1)])
    uta=np.r_[0,np.cumsum(np.linalg.norm(np.diff(ur,axis=0),axis=1))]
    ucontrols=np.asarray(splev(usamples[:,0],utck)).T
    uworld=CubicSpline(uta,ur,axis=0)(np.interp(usamples[:,0],us,uarc)/uarc[-1]*uta[-1])
    field=RBFInterpolator(np.r_[controls,ucontrols],np.r_[curve(arc(np.interp(samples[:,0],ss,sa))),uworld],kernel='thin_plate_spline')
    adjacent={'cornerNumbers':[8,9],'sourceRoadSamples':usamples.tolist(),'sourceControls':ucontrols.tolist(),'worldControls':uworld.tolist()}
fp=[[742,270],[759,270],[775,269],[789,265],[802,260]]
bp=[[742,279],[759,280],[778,277],[794,272],[806,267]]
if ge20:
    fp=[[680,287],[670,304],[663,328],[663,355],[665,380],[668,394],[678,417]]
    bp=[[690,293],[680,310],[676,330],[676,355],[677,380],[681,394],[691,411]]
if ge23:
    fp=[[815,190],[810,201],[802,216],[793,233],[787,244]]
    bp=[[807,187],[802,198],[793,213],[784,230],[779,240]]
def edge(points):
    p=np.array(points);a=np.r_[0,np.cumsum(np.linalg.norm(np.diff(p,axis=0),axis=1))];s=np.linspace(0,a[-1],110)
    return np.c_[np.interp(s,a,p[:,0]),np.interp(s,a,p[:,1])]
source_front,source_back=edge(fp),edge(bp)
front,back=field(source_front),field(source_back)
for k in range(len(front)-1):
    q=np.array([front[k],front[k+1],back[k+1],back[k]]);v=np.roll(q,-1,axis=0)-q;w=np.roll(v,-1,axis=0)
    turns=v[:,0]*w[:,1]-v[:,1]*w[:,0]
    assert min(abs(turns))>1e-8 and np.all(turns*turns[0]>0),f'Folded {label} span {k}'
boundary=np.r_[front,back[::-1],front[:1]];shape=Polygon(boundary)
roads=unary_union([Polygon(t) for t in m['triangles']])
assert shape.is_valid and shape.intersection(roads).area<1e-6,f'Invalid {label} bank or road intersection'
others=[]
for z in d['spectatorZones']:
    if z['zoneId']==zone_id:continue
    for surface in z['surfaces']:
        area=shape.intersection(Polygon((np.array(surface['boundary'])-o)*factor)).area
        if area>1e-6:others.append({'zoneId':z['zoneId'],'availability':z['availability'],'areaMetres2':area})
assert not any(a['availability']=='available' for a in others),'Intersects active bank'
path=ROOT/f'src/circuits/europe/madrid-{bank}-2026.json';previous=read(path) if path.exists() else None
old=previous['oldZone'] if previous else next(z for z in d['spectatorZones'] if z['zoneId']==zone_id)
zone=copy.deepcopy(old);depth=float(np.min(np.linalg.norm(front-back,axis=1)))
rows=max(2,int(depth/.85));rise=round((rows-1)*.4,2)
center=(front.mean(axis=0)+back.mean(axis=0))/2;ref=target[np.argmin(np.linalg.norm(target-center,axis=1))]
provenance={'url':'https://www.madring.com/img/xl/mapa-madring/mapa_web_11_8_26_ing.webp','checkedAt':'2026-10-27','method':'estimated','confidence':'low',
 'notes':'Final2026 GE18–GE19 visible curved ribbon. Approximate straight caps and wheelchair-symbol-covered left edge, about1–2px. Observed T13–T16 road medials with label-covered corner anchors; road-only 2D thin-plate field. No clearance/photo fitting.'}
if ge20:provenance['notes']='Final2026 GE20–GE22 visible ribbon including both curved ends. Wheelchair symbols hide short edge sections at both ends; continued from visible edges, about1–2px. Observed T14–T17 black-road medials and label-covered anchors; road-only thin-plate registration, no clearance/photo fitting.'
if ge23:provenance['notes']='Final2026 visible GE23 bank. T13–T16 plus adjacent observed T8–T9 road branches constrain a 2D thin-plate field. Label/icon-covered corners and caps estimated; no clearance/photo fitting. Map label is confirmed, ordinary-ticket admission remains unverified.'
zone.update(name=label,availability='preparing',boundary=(o+boundary/factor).tolist(),boundarySource=provenance,openingSource=provenance,
 admissionNote='图示范围含无障碍设施，局部平台未单独还原。',
 surfaceSource={**provenance,'notes':'Minimum mapped depth /0.85m rows and0.4m rise, original3.2m platform and1.2m seated eye. No surveyed section.'},
 geometryReview={'checkedAt':'2026-10-27','issues':['Shared engine and three-viewport scene acceptance pending.'],'method':'Visible source row ribbon, observed road-only registration.'})
zone['surfaces'][0].update(boundary=zone['boundary'],rows=rows,rise=rise,frontReference=(o+ref/factor).tolist(),rowBearing='local-normal',rowStrip={'front':(o+front/factor).tolist(),'back':(o+back/factor).tolist(),'source':provenance})
zone['surface'].update(depth=depth,rise=rise)
if ge23:zone['geometryReview']['issues']=['2026 ordinary-ticket admission unresolved; bank remains closed.'];zone['admissionNote']='2026普通票准入尚未核实。'
if previous:
    structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
    if structure(zone)==structure(previous['zone']):zone['availability']=previous['zone']['availability'];zone['geometryReview']=previous['zone']['geometryReview']
report={'circuitId':'madrid','season':2026,'sourceSha256':sha,'sourceUrl':provenance['url'],
 'geometryFingerprint':hashlib.sha256(json.dumps({k:d[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),
 'sourceRoadSamples':samples.tolist(),'sourceRoadFitRmsPixels':float(np.sqrt(np.mean(np.sum((np.asarray(splev(samples[:,0],tck)).T-samples[:,1:])**2,axis=1)))),
 'cornerNumbers':corner_numbers,'estimatedCornerAnchors':pilot[anchor_indices].tolist(),
 'sourceFrontPixels':fp,'sourceBackPixels':bp,'minimumDepthMetres':depth,'roadIntersectionMetres2':shape.intersection(roads).area,'roadClearanceMetres':shape.distance(roads),
 'zone':zone,'oldZone':old,'inventoryComplete':False,'otherIntersections':others,
 'unmodeledFacilities':['Wheelchair pictogram at left end; independent platform geometry unknown.','Live-screen icon below rear edge; dimensions/height unknown.']}
if ge20:report['unmodeledFacilities']=['Wheelchair pictograms at both ends; independent platforms unknown.','Two live-screen icons outside opposite road edge; dimensions and heights unknown.']
if ge23:
    assert zone['availability']=='preparing','Do not open GE23 without a new annual access review'
    report['adjacentRoadRegistration']=adjacent
    legacy=Polygon((np.array(old['boundary'])-o)*factor)
    neighbor=next(z for z in d['spectatorZones'] if z['zoneId']=='t14t15')
    report['oldGeometryComparison']={'roadIntersectionMetres2':legacy.intersection(roads).area,'ge18IntersectionMetres2':sum(legacy.intersection(Polygon((np.array(s['boundary'])-o)*factor)).area for s in neighbor['surfaces']),'newRoadIntersectionMetres2':report['roadIntersectionMetres2'],'newOtherIntersections':others}
    report['unmodeledFacilities']=['Ignition Club marker7 overlaps the source ribbon; venue/product-to-bank access crosswalk and structure unknown.','Nearby live-screen dimensions and height unknown.']
if previous and zone['availability']=='available' and 'sceneAcceptance' in previous:report['sceneAcceptance']=previous['sceneAcceptance']
path.write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(json.dumps({k:report[k] for k in ['sourceRoadFitRmsPixels','minimumDepthMetres','roadIntersectionMetres2','roadClearanceMetres','otherIntersections']}))
