"""Official K1–K6 continuous curved footprint; candidate, no runtime writes."""
from monaco_road_registration import (ROOT,read,data,metric,alignment,public,drawings,
    worldRoad,o,factor,warp,copy,hashlib,json,np,Polygon,LineString,Point,unary_union)

drawing=drawings[5592]
assert len(drawing['items'])==6 and all(item[0]=='c' for item in drawing['items'])
def bezier(item):
    p,q,r,s=np.array(item[1:])*alignment['basisScale']
    return np.array([(1-t)**3*p+3*(1-t)**2*t*q+3*(1-t)*t*t*r+t**3*s for t in np.linspace(0,1,500)])
front_curve=np.r_[bezier(drawing['items'][3]),bezier(drawing['items'][4])[1:]]
back_curve=np.r_[bezier(drawing['items'][1])[::-1],bezier(drawing['items'][0])[::-1][1:]]
def edge(curve):
    arc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(curve,axis=0),axis=1))];values=np.linspace(0,arc[-1],160)
    return np.c_[np.interp(values,arc,curve[:,0]),np.interp(values,arc,curve[:,1])]
front_source,back_source=edge(front_curve),edge(back_curve)
front=np.array([warp(p) for p in front_source]);back=np.array([warp(p) for p in back_source])
for k in range(len(front)-1):
    q=np.array([front[k],front[k+1],back[k+1],back[k]])
    v=np.roll(q,-1,axis=0)-q;w=np.roll(v,-1,axis=0);turns=v[:,0]*w[:,1]-v[:,1]*w[:,0]
    assert min(abs(turns))>1e-8 and np.all(turns*turns[0]>0),f'K folded span {k}'
boundary=np.r_[front,back[::-1],front[:1]];shape=Polygon(boundary)
roads=unary_union([Polygon(t) for t in metric['triangles']])
assert shape.is_valid and shape.intersection(roads).area<1e-6,'K intersects current road'
others=[]
for z in data['spectatorZones']:
    if z['zoneId']=='k-tabac':continue
    for s in z['surfaces']:
        area=shape.intersection(Polygon((np.array(s['boundary'])-o)*factor)).area
        if area>1e-6:others.append({'zoneId':z['zoneId'],'availability':z['availability'],'areaMetres2':area})
assert not any(i['availability']=='available' for i in others)
path=ROOT/'src/circuits/europe/monaco-k-2026.json';previous=read(path) if path.exists() else None
old=previous['oldZone'] if previous else next(z for z in data['spectatorZones'] if z['zoneId']=='k-tabac')
zone=copy.deepcopy(old);depth=float(np.min(np.linalg.norm(front-back,axis=1)))
rows=max(2,int(depth/.85));rise=round((rows-1)*.4,2)
center=(front.mean(axis=0)+back.mean(axis=0))/2;reference=worldRoad.interpolate(worldRoad.project(Point(center)))
cap_deviation=max(LineString([curve[0],curve[-1]]).distance(Point(p)) for index in [2,5] for curve in [bezier(drawing['items'][index])] for p in curve)
source={'url':public['sourceUrl'],'checkedAt':'2026-10-27','method':'estimated','confidence':'low',
    'notes':'K1–K6 curved bank confirmed in official2026 public artwork. Original PDF front/rear Bezier paths, subpixel straight cap approximation; fixed normalized-road-arc registration. Not surveyed ticket partitions, deck heights or seating.'}
zone.update(name='K1–K6 · 阿尔贝一世码头',availability='preparing',boundary=(o+boundary/factor).tolist(),boundarySource=source,openingSource=source,
    surfaceSource={**source,'notes':'Minimum mapped depth /0.85m rows,0.4m row rise; original3.2m platform and1.2m seated eye retained. No surveyed section.'},
    admissionNote='图示为合并观赛范围，不代表单张门票可跨分区通行。',
    geometryReview={'checkedAt':'2026-10-27','issues':['Shared mesh and three-viewport scene acceptance pending.'],'method':'Official curved source footprint, fixed road registration; no road clipping or post-registration translation.'})
zone['surfaces'][0].update(boundary=zone['boundary'],rows=rows,rise=rise,rowBearing='local-normal',frontReference=(o+np.array(reference.coords)[0]/factor).tolist(),rowStrip={'front':(o+front/factor).tolist(),'back':(o+back/factor).tolist(),'source':source})
zone['surface'].update(depth=depth,rise=rise)
if previous:
    structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
    if structure(zone)==structure(previous['zone']):zone['availability']=previous['zone']['availability'];zone['geometryReview']=previous['zone']['geometryReview']
record={'circuitId':'monaco','season':2026,'sourceUrl':public['sourceUrl'],'sourceSha256':public['sourceSha256'],
    'basisPdfSha256':alignment['basisPdfSha256'],'sourcePathIndex':5592,
    'sourceOperators':[[item[0],*[list(p) for p in item[1:]]] for item in drawing['items']],
    'sourceFrontPixels':front_source.tolist(),'sourceBackPixels':back_source.tolist(),'sourceCapStraighteningMaxDeviationPixels':cap_deviation,
    'geometryFingerprint':hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),
    'roadWidthMetres':data['trackGeometry']['widthMetres'],'minimumDepthMetres':depth,'roadIntersectionMetres2':shape.intersection(roads).area,
    'roadClearanceMetres':shape.distance(roads),'otherIntersections':others,
    'oldCurrentRoadIntersectionMetres2':Polygon((np.array(old['boundary'])-o)*factor).intersection(roads).area,
    'zone':zone,'oldZone':old,'inventoryComplete':False}
if previous and zone['availability']=='available' and 'sceneAcceptance' in previous:record['sceneAcceptance']=previous['sceneAcceptance']
path.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(json.dumps({k:record[k] for k in ['minimumDepthMetres','roadIntersectionMetres2','oldCurrentRoadIntersectionMetres2','roadClearanceMetres','otherIntersections']}))
