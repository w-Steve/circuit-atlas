"""Official 2026 B/Casino, A/Kennedy or V vector envelope; no runtime writes."""
from monaco_road_registration import (ROOT, read, data, metric, alignment, public, drawings, sourceRoad, worldRoad, o, factor, warp, copy, hashlib, json, np, Polygon, LineString, Point, unary_union)

import argparse
parser=argparse.ArgumentParser();parser.add_argument('--bank',choices=['b','a','v'],default='b');bank=parser.parse_args().bank
is_a=bank=='a';is_v=bank=='v';zone_id={'a':'a-sainte-devote','b':'b-casino','v':'v-anthony-noghes'}[bank]
path_index={'a':5594,'b':5601,'v':5587}[bank]
if is_v:
    from monaco_public_registration import warp_basis as warp,validate_basis_polygon
drawing=drawings[path_index]
assert len(drawing['items'])==4 and drawing['fill'][0]>.8
assert [item[0] for item in drawing['items']]==['l','c','l','c']
cap_deviation=0.
for kind,*ps in drawing['items']:
    if kind!='c':continue
    a,b,c,e=np.array(ps)*alignment['basisScale'];line=LineString([a,e])
    cap_deviation=max(cap_deviation,max(line.distance(Point((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*e)) for t in np.linspace(0,1,101)))
assert cap_deviation<.5,'Source end-cap curvature needs explicit modeling'
quad=np.array([item[1] for item in drawing['items']])*alignment['basisScale']
assert Polygon(quad).is_valid
if is_v:validate_basis_polygon(Polygon(quad))
distances=[np.mean([sourceRoad.distance(Point(p)) for p in np.linspace(a,b,21)]) for a,b in zip(quad,np.roll(quad,-1,axis=0))]
front_index=int(np.argmin(distances))
front_source=np.linspace(quad[front_index],quad[(front_index+1)%4],110)
back_source=np.linspace(quad[(front_index-1)%4],quad[(front_index+2)%4],110)
front=np.array([warp(p) for p in front_source]);back=np.array([warp(p) for p in back_source])
for k in range(len(front)-1):
    q=np.array([front[k],front[k+1],back[k+1],back[k]])
    v=np.roll(q,-1,axis=0)-q;w=np.roll(v,-1,axis=0);turns=v[:,0]*w[:,1]-v[:,1]*w[:,0]
    assert min(abs(turns))>1e-8 and np.all(turns*turns[0]>0),f'B folded span {k}'
boundary=np.r_[front,back[::-1],front[:1]];shape=Polygon(boundary)
roads=unary_union([Polygon(t) for t in metric['triangles']])
assert shape.is_valid and shape.intersection(roads).area<1e-6,'B source bank intersects current road'
others=[]
for z in data['spectatorZones']:
    if z['zoneId']==zone_id:continue
    for surface in z['surfaces']:
        area=shape.intersection(Polygon((np.array(surface['boundary'])-o)*factor)).area
        if area>1e-6:others.append({'zoneId':z['zoneId'],'availability':z['availability'],'areaMetres2':area})
assert not any(i['availability']=='available' for i in others)
path=ROOT/f'src/circuits/europe/monaco-{bank}-2026.json';previous=read(path) if path.exists() else None
old=previous['oldZone'] if previous else next(z for z in data['spectatorZones'] if z['zoneId']==zone_id)
zone=copy.deepcopy(old);depth=float(np.min(np.linalg.norm(front-back,axis=1)))
rows=max(2,int(depth/.85));rise=round((rows-1)*.4,2)
center=(front.mean(axis=0)+back.mean(axis=0))/2
reference=worldRoad.interpolate(worldRoad.project(Point(center)))
source={'url':public['sourceUrl'],'checkedAt':'2026-10-27','method':'estimated','confidence':'low',
    'notes':'B/Casino confirmed in official2026 public map. Original trapezoid corners from matching official PDF artwork, subpixel curved caps approximated as straight, fixed road-arc registration, no clearance/photo fitting. Geographic placement and row section remain approximate.'}
if is_a:
    zone['name']='A · 肯尼迪大道'
    source['notes']='A/Avenue J.-F. Kennedy confirmed in official2026 public map. Original matching PDF trapezoid, subpixel straightened caps and fixed road-arc registration; no legacy world-position override or clearance/photo fitting. Placement and section remain approximate.'
elif is_v:
    zone['name']='V · 安东尼诺盖弯'
    source['notes']='V/Virage Antony Noghes confirmed in official2026 public legend. Original matching PDF trapezoid with subpixel straightened caps. Shared public-artwork registration includes geographic junction controls because V lies outside road-only support. Image correspondences and row section remain approximate; no clearance/photo fitting.'
zone.update(availability='preparing',boundary=(o+boundary/factor).tolist(),boundarySource=source,openingSource=source,
    surfaceSource={**source,'notes':'Minimum mapped depth /0.85m row spacing and0.4m rise; original platform and1.2m seated eye retained. No surveyed section.'},
    geometryReview={'checkedAt':'2026-10-27','issues':['Saved default cockpit ray intersects own seating mesh; verify row/deck section and foundation datum before release.'],'method':'Official source trapezoid, fixed normalized-road-arc registration.'})
zone['surfaces'][0].update(boundary=zone['boundary'],rows=rows,rise=rise,rowBearing='local-normal',frontReference=(o+np.array(reference.coords)[0]/factor).tolist(),rowStrip={'front':(o+front/factor).tolist(),'back':(o+back/factor).tolist(),'source':source})
zone['surface'].update(depth=depth,rise=rise)
if is_a or is_v:zone['geometryReview']['issues']=['Shared mesh and three-viewport scene acceptance pending.']
if is_v:zone['geometryReview']['method']='Official source trapezoid, shared non-folding public-artwork geographic registration.'
if previous:
    structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
    if structure(zone)==structure(previous['zone']):zone['availability']=previous['zone']['availability'];zone['geometryReview']=previous['zone']['geometryReview']
record={'circuitId':'monaco','season':2026,'sourceUrl':public['sourceUrl'],'sourceSha256':public['sourceSha256'],
    'sourceMetadataUrl':public['sourceMetadataUrl'],'sourcePublishedAt':public['sourcePublishedAt'],
    'basisPdfSha256':alignment['basisPdfSha256'],'sourcePathIndex':path_index,'sourceQuadPixels':quad.tolist(),'sourceFrontEdgeIndex':front_index,'sourceCapStraighteningMaxDeviationPixels':cap_deviation,
    'sourceOperators':[[item[0],*[list(p) for p in item[1:]]] for item in drawing['items']],
    'geometryFingerprint':hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),
    'roadWidthMetres':data['trackGeometry']['widthMetres'],'minimumDepthMetres':depth,'roadIntersectionMetres2':shape.intersection(roads).area,'roadClearanceMetres':shape.distance(roads),
    'otherIntersections':others,'oldCurrentRoadIntersectionMetres2':Polygon((np.array(old['boundary'])-o)*factor).intersection(roads).area,'zone':zone,'oldZone':old,'inventoryComplete':False}
if is_v:
    record['registrationControlsSha256']=hashlib.sha256((ROOT/'src/circuits/europe/monaco-rocher-controls-2026.json').read_bytes()).hexdigest()
    rocher=read('src/circuits/europe/monaco-rocher-world-candidate-2026.json')
    assert rocher['controlsSha256']==record['registrationControlsSha256'] and rocher['geometryFingerprint']==record['geometryFingerprint'],'Rebuild the Rocher candidate before checking shared registration'
    record['rocherIntersectionsMetres2']=[shape.intersection(Polygon((np.array(s['boundary'])-o)*factor)).area for s in rocher['zone']['surfaces']]
    oldShape=Polygon((np.array(old['boundary'])-o)*factor)
    record['oldRocherIntersectionsMetres2']=[oldShape.intersection(Polygon((np.array(s['boundary'])-o)*factor)).area for s in rocher['zone']['surfaces']]
    assert max(record['rocherIntersectionsMetres2'])<1e-6,'Shared source outlines overlap; review source boundaries'
if previous and zone['availability']=='available' and 'sceneAcceptance' in previous:record['sceneAcceptance']=previous['sceneAcceptance']
if previous and previous.get('zone')==zone and 'candidateReview' in previous:record['candidateReview']=previous['candidateReview']
path.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(json.dumps({k:record[k] for k in ['minimumDepthMetres','roadIntersectionMetres2','oldCurrentRoadIntersectionMetres2','roadClearanceMetres','otherIntersections']}))
