"""Road-only 2D registration of GD raster silhouettes; candidate, no runtime writes."""
import copy, hashlib, json, math
from pathlib import Path
import numpy as np
from scipy.interpolate import CubicSpline, PchipInterpolator, RBFInterpolator, splprep, splev
from shapely.geometry import Polygon
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/madrid.json')
m=read('artifacts/goal-review/madrid-main/metric.json')
assert m['inputs']=={k:d[k] for k in ['trackGeometry','corners','elevation']}
pixel=read('src/circuits/europe/madrid-inner-contours-2026.json')
outer=read('src/circuits/europe/madrid-ge7-2026.json')
assert pixel['sourceSha256']==outer['sourceSha256']
fingerprint=hashlib.sha256(json.dumps({k:d[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
assert fingerprint==outer['geometryFingerprint']
assert pixel['circuitId']=='madrid' and pixel['season']==2026
samples=np.array(outer['sourceRoadSamples'])
tck,_=splprep(samples[:,1:].T,u=samples[:,0],s=len(samples)*.5**2)
ss=np.linspace(samples[0,0],samples[-1,0],4000)
source=np.asarray(splev(ss,tck)).T
sa=np.r_[0,np.cumsum(np.linalg.norm(np.diff(source,axis=0),axis=1))]
o=np.array(m['origin']);factor=np.array([111320*math.cos(math.radians(o[1])),-111320])*m['calibration']
road=np.array(m['road'])[:,[0,2]]
corners={c['number']:c['coordinate'] for c in d['corners']}
i,j=[int(np.argmin(np.linalg.norm(road-(np.array(corners[n])-o)*factor,axis=1))) for n in [11,13]]
step=1 if (j-i)%len(road)<(i-j)%len(road) else -1
target=np.array([road[(i+k*step)%len(road)] for k in range(min((j-i)%len(road),(i-j)%len(road))+1)])
ta=np.r_[0,np.cumsum(np.linalg.norm(np.diff(target,axis=0),axis=1))]
mid=np.argmin(np.linalg.norm(source-[1092,222],axis=1))
tm=ta[np.argmin(np.linalg.norm(target-(np.array(corners[12])-o)*factor,axis=1))]
arc=PchipInterpolator([0,sa[mid],sa[-1]],[0,tm,ta[-1]])
assert min(arc.derivative()(sa))>0
curve=CubicSpline(ta,target,axis=0)
controls=np.asarray(splev(samples[:,0],tck)).T
dest=curve(arc(np.interp(samples[:,0],ss,sa)))
field=RBFInterpolator(controls,dest,kernel='thin_plate_spline')
old=read('src/circuits/europe/madrid-inner-2026.json')['oldZone']
surfaces=[];metrics=[];shapes=[]
ignored=[{'label':a['label'],'part':i,'areaPixels2':Polygon(r).area,'reason':'isolated one-pixel raster fragment; original retained in pixel source'} for a in pixel['arcs'] for i,r in enumerate(a['sourceContoursPixels']) if Polygon(r).area<=1]
roads=unary_union([Polygon(t) for t in m['triangles']])
provenance={'url':pixel['sourceUrl'],'checkedAt':'2026-10-27','method':'estimated','confidence':'low',
    'notes':'2D thin-plate field from observed road correspondences only, not road clearance or photo visibility. Raster lettering/icon edge uncertainty remains; no surveyed section or individual ticket entitlement.'}
from madrid_inner_rows import rows_from_ribbons
for a in rows_from_ribbons(pixel['arcs']):
    front,back=field(a['front']),field(a['back'])
    signs=[]
    for k in range(len(front)-1):
        q=np.array([front[k],front[k+1],back[k+1],back[k]])
        v=np.roll(q,-1,axis=0)-q;w=np.roll(v,-1,axis=0)
        turns=v[:,0]*w[:,1]-v[:,1]*w[:,0]
        assert np.min(abs(turns))>1e-8 and np.all(turns*turns[0]>0), f'{a["label"]}: folded strip {k}'
        signs.append(float(min(abs(turns))))
    world=np.r_[front,back[::-1],front[:1]]
    shape=Polygon(world)
    assert shape.is_valid and shape.intersection(roads).area<1e-6, f'{a["label"]}: invalid or road intersection'
    assert all(shape.intersection(p).area<1e-6 for p in shapes)
    for z in d['spectatorZones']:
        if z['zoneId']=='monumental-12':continue
        for surface in z['surfaces']:
            assert shape.intersection(Polygon((np.array(surface['boundary'])-o)*factor)).area<1e-6, f'{a["label"]}: overlaps {z["zoneId"]}'
    depth=float(np.min(np.linalg.norm(front-back,axis=1)))
    rows=max(2,int(depth/.85));rise=round((rows-1)*.4,2)
    center=np.array(shape.centroid.coords)[0];ref=target[np.argmin(np.linalg.norm(target-center,axis=1))]
    surfaces.append({**old['surfaces'][0],'surfaceId':f'monumental-12-gd-{len(surfaces)+1}',
        'boundary':(o+world/factor).tolist(),'rows':rows,'rise':rise,
        'frontReference':(o+ref/factor).tolist(),'rowBearing':'local-normal',
        'rowStrip':{'front':(o+front/factor).tolist(),'back':(o+back/factor).tolist(),'source':provenance}})
    shapes.append(shape)
    metrics.append({'label':a['label'],'minimumStripTurnMagnitude':min(signs),
        'roadIntersectionMetres2':shape.intersection(roads).area,'roadClearanceMetres':shape.distance(roads),
        'minimumDepthMetres':depth,'sourceFrontPixels':a['front'].tolist(),'sourceBackPixels':a['back'].tolist(),
        **{k:v for k,v in a.items() if k not in ['front','back','label']}})
zone=copy.deepcopy(old)
zone.update(name='GD1–GD11 看台',availability='preparing',boundary=surfaces[0]['boundary'],surfaces=surfaces,
    boundarySource=provenance,openingSource=provenance,surfaceSource={**provenance,'notes':'Minimum paired strip depth / 0.85m estimates rows with 0.4m rise; source radial fit is not a surveyed curved seating profile. Original platform and seated eye retained; no measured cross-section.'},
    admissionNote='图示为合并观赛范围，不代表单张门票可跨分区通行。',
    geometryReview={'checkedAt':'2026-10-27','issues':['GD11 source radial continuation up to approximately 8px under icon/text occlusion remains uncertain.', 'Curved seating section and annual admission acceptance pending.'],'method':'Road-only thin-plate registration of separate raster seat ribbons.'})
zone['surface'].update(depth=metrics[0]['minimumDepthMetres'],rise=surfaces[0]['rise'])
report={'circuitId':'madrid','season':2026,'sourceSha256':pixel['sourceSha256'],
    'geometryFingerprint':fingerprint,
    'sourceContoursSha256':hashlib.sha256((ROOT/'src/circuits/europe/madrid-inner-contours-2026.json').read_bytes()).hexdigest(),
    'zone':zone,'oldZone':old,'sourceRegistration':{'sourceRoadControls':controls.tolist(),'worldRoadControls':dest.tolist(),'method':'thin_plate_spline','referenceCorners':[11,12,13]},
    'surfaceMetrics':metrics,'ignoredPixelFragments':ignored,'inventoryComplete':False,
    'rowFitMethod':'Source-image shared radial center fitted to ribbon outline vertices, cubic front/back radii from visible thick sections; rounded cap/icon and within-ribbon raster text gaps continued and recorded per bank; distinct GD arcs never joined, never fit to road clearance or photographs.',
    'limits':'Candidate only. No availability or survey claim; raster edge occlusion, admission, structures and scene review unresolved.'}
candidatePath=ROOT/'src/circuits/europe/madrid-inner-world-candidate-2026.json'
if candidatePath.exists():
    previous=read(candidatePath.relative_to(ROOT))
    if previous.get('zone')==zone and 'candidateValidation' in previous:report['candidateValidation']=previous['candidateValidation']
(ROOT/'src/circuits/europe/madrid-inner-world-candidate-2026.json').write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(json.dumps({'surfaces':len(surfaces),'ignoredFragments':len(ignored),'metrics':[{k:v for k,v in a.items() if k not in ['sourceFrontPixels','sourceBackPixels']} for a in metrics]}))
