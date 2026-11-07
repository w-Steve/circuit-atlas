"""Extract reviewed factual grandstand coordinates from the official public map.
Default16 remains compatible; --stand=<number> selects a reviewed source identity.
Raw PAM assets stay in research; source styling heights are never physical data.
"""
import copy,hashlib,json,math,sys
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
number=next((a.split('=',1)[1] for a in sys.argv[1:] if a.startswith('--stand=')),'16')
identities={'1':('7b3ad513-7fa4-4322-a499-e4a02fc11edd','d7b58002-f759-4ed9-8e7e-834c70f969b4'),'16':('c7babc18-75be-4946-ac98-af8a73d2d5aa','380a14c4-591a-4c2b-873e-fd680ca0ed3f'),'10':('432b34f1-55df-4b30-9f67-fcf714eb6b03','d757a8d6-6f07-43a2-aed1-943ac71966bb'),'21':('b334ccea-a8aa-4a2a-b231-a8fc93cd28cd','a59622ea-c860-4a20-9979-2d8a083783b1'),'34':('a07daec5-a310-4425-978f-57a08e02cfd0','50bbf594-15de-474e-9038-b8569b4b0013'),'47':('c0a9448f-a58a-43e1-9c1c-cfa1e200c326','040ec36f-3a27-404f-8424-71950e692ce9'),'31':('a91b301e-576c-4926-acd1-3aea5cc7bbc9','7229b7ff-c0c3-419e-8c7b-2d1e1f4b9a6d'),'32':('bb9f1386-1762-4719-ba36-b4f1caa7a7e0','1eed1cce-1338-4dc1-ada8-0bc29ca35130'),'33':('092999a2-0b95-4210-86c7-9e72eb247386','8df3e7a8-a092-4d92-b533-f037a64f0f88')}
assert number in identities,'Only explicitly reviewed source identities may build'
tenantId,featureId=identities[number];zoneId=f'grandstand-{number}'
raw=ROOT/'research/americas/montreal-pam-public/response-1.json'
digest=hashlib.sha256(raw.read_bytes()).hexdigest();assert digest=='0112b4db9bf3fc43ce2e531b49a4c0576f9aec72421aded085a340003a349f42'
public=read(str(raw.relative_to(ROOT)));assert public['clientId']=='F1GPCAN'
manifest=read('research/americas/montreal-pam-public/manifest.json');retrieval=next(a for a in manifest['requests'] if a['file']==raw.name)
assert retrieval['sha256']==digest and retrieval['status']==200
tenant=next(t for t in public['tenants'] if t['uuid']==tenantId)
assert tenant['name']==('Grandstand 01' if number=='1' else f'Grandstand {number}') and tenant['category']['name']=='Grandstands'
feature=next(f for f in public['navMap']['features'] if f['id']==featureId)
assert feature['properties']['tenantId']==tenant['uuid'] and feature['geometry']['type']=='Polygon'
assert len(feature['geometry']['coordinates'])==1
boundary=feature['geometry']['coordinates'][0];assert boundary[0]==boundary[-1]
annualLinks=sorted({l.get('website','') for l in public['locations'] if 'f1experiences.com/2026-canadian-grand-prix/' in l.get('website','')})
assert len(annualLinks)==2,'Reinspect annual branding/context of this map snapshot'
data=read('src/circuits/generated/montreal.json');metric=read('artifacts/goal-review/montreal-standing-metric.json')
assert data['circuitId']=='montreal' and data['season']==2026
assert metric['inputs']=={k:data[k] for k in ['trackGeometry','corners','elevation']}
assert data['trackGeometry']['widthMetres']==10
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
shape=Polygon((np.array(boundary)-origin)*factor);assert shape.is_valid
roads=unary_union([Polygon(t) for t in metric['triangles']]);overlap=shape.intersection(roads).area;assert overlap<1e-6
other=[]
for z in data['spectatorZones']:
    if z['zoneId']==zoneId:continue
    for surface in z['surfaces']:
        area=shape.intersection(Polygon((np.array(surface['boundary'])-origin)*factor)).area
        if area>1e-6:other.append({'zoneId':z['zoneId'],'availability':z['availability'],'areaMetres2':area})
assert not other,'Do not trim an authoritative footprint to fit another model'
target=ROOT/f'src/circuits/americas/montreal-{number}-2026.json';previous=read(str(target.relative_to(ROOT))) if target.exists() else None
old=previous['oldZone'] if previous else next(z for z in data['spectatorZones'] if z['zoneId']==zoneId)
box=np.array(shape.minimum_rotated_rectangle.exterior.coords);depth=float(min(np.linalg.norm(b-a) for a,b in zip(box[:-1],box[1:])))
rows=max(2,int(depth/.85));rise=round((rows-1)*.4,2);road=LineString(metric['road']+[metric['road'][0]]);reference=road.interpolate(road.project(shape.centroid))
evidence={'url':'https://gpcanada.ca/en/event/site-map/','checkedAt':'2026-10-27','method':'extracted','confidence':'medium','notes':f'Organizer-embedded public PAM map snapshot: welcome logo explicitly2026,2026 package links retained, Grandstand{number} tenant/category and geographic polygon matched. Website wrapper now2027; snapshot branding/context separately verified. Factual coordinates only, not seat survey or live admission guarantee.'}
zone=copy.deepcopy(old);zone.update(availability='preparing',boundary=boundary,source=evidence,boundarySource=evidence,openingSource=evidence,surfaceSource={**evidence,'method':'estimated','confidence':'low','notes':'Minimum footprint thickness /0.85m tread,0.4m row rise; original2.2m platform and1.2m seated eye retained. PAM styleExtrusionHeight ignored; no surveyed section.'},geometryReview={'checkedAt':'2026-10-27','issues':['Shared mesh and three-viewport scene acceptance pending.'],'method':'Direct geographic public-map polygon; no diagram scale, clipping or relocation.'})
zone['surfaces'][0].update(boundary=boundary,rows=rows,rise=rise,frontReference=(origin+np.array(reference.coords)[0]/factor).tolist());zone['surface'].update(depth=depth,rise=rise)
if number=='1':
    # The notched rear has varying depths; use physical treads from the long
    # unnotched track-facing source edge instead of compressing equal row counts.
    a=(np.array(boundary[36])-origin)*factor;b=(np.array(boundary[37])-origin)*factor
    axis=(b-a)/np.linalg.norm(b-a);normal=np.array([-axis[1],axis[0]])
    if np.dot(np.array(reference.coords)[0]-np.array(shape.centroid.coords)[0],normal)>0:normal=-normal
    maximumDepth=float(max(np.dot((np.array(c)-origin)*factor-a,normal) for c in boundary))
    rows=math.ceil(maximumDepth/.85);rise=round((rows-1)*.4,2)
    zone['surfaces'][0].update(rows=rows,rise=rise,rowPitch={'treadMetres':.85,'riserMetres':.4,'source':{**evidence,'method':'estimated','confidence':'low','notes':'Assumed .85m tread/.4m riser, not surveyed2026 seats. Notched rear terminates each section at its original depth.'}},rowFrontEdge={'coordinates':[boundary[36],boundary[37]],'source':{**evidence,'method':'estimated','notes':'Original long unnotched edge36 faces the pit/starting straight, consistent with the map description. Row section remains estimated.'}})
    zone['surface']['rise']=rise
if number=='34':
    # The almost-square rounded footprint has no reliable PCA row axis.
    # The organizer's frontal gallery shows straight rows facing the Hairpin;
    # retain the exact original north/front edge, not a rotated substitute.
    assert len(boundary)==34
    gallery=ROOT/'research/americas/montreal34-gallery-1.png'
    assert hashlib.sha256(gallery.read_bytes()).hexdigest()=='25d6b1ce6e19dd1c83c11dc417df386c3241d9cc68dad15c3ba2ceccfd34abde'
    edge=[boundary[16],boundary[17]]
    zone['surfaces'][0]['rowFrontEdge']={'coordinates':edge,'source':{'url':'https://gpcanada.ca/wp-content/uploads/2023/05/jfsavariaxvendredi-2-2-1000x602.png','checkedAt':'2026-10-27','method':'estimated','confidence':'medium','notes':'Current organizer34 gallery shows straight rows; interpreted front edge16 of fixed2026 geographic footprint faces the named Hairpin. Image is orientation context only, not2026 admission or measured section proof.'}}
    zone['surfaces'][0]['frontReference']=next(c['coordinate'] for c in data['corners'] if c['number']==10)
if number=='31':
    duplicate='fd4193c7-8b1f-47e3-bb0a-12c1d574c1d0'
    assert raw.read_text('utf8').count(duplicate)==1,'Reconcile new references to the duplicate tenant'
    assert {t['uuid'] for t in public['tenants'] if t['name']=='Grandstand 31'}=={tenantId,duplicate}
    assert len(boundary)==32
    gallery=ROOT/'research/americas/montreal31-gallery-0.jpg'
    assert hashlib.sha256(gallery.read_bytes()).hexdigest()=='c0475216a093743a5c9a38c060c4d1c5dd22228714a08172cebba457118f2089'
    zone['surfaces'][0]['rowFrontEdge']={'coordinates':[boundary[22],boundary[23]],'source':{'url':'https://gpcanada.ca/wp-content/uploads/2023/05/jfsavariaxdimanche-66-e1691767665577-1000x666.jpg','checkedAt':'2026-10-27','method':'estimated','confidence':'medium','notes':'Organizer frontal photo shows straight rows toward T8–9, consistent with the fixed2026 map description of approaching cars. Original south/front edge22 retained. Current gallery is orientation context, not surveyed2026 seating or admission proof.'}}
    zone['surfaces'][0]['frontReference']=next(c['coordinate'] for c in data['corners'] if c['number']==8)
if number=='32':
    # Rear notches must not choose the viewing axis. The unnotched west edge
    # faces the sourced T6-left/T7-right chicane description from inside the track.
    assert len(boundary)==56
    zone['surfaces'][0]['rowFrontEdge']={'coordinates':[boundary[0],boundary[1]],'source':{**evidence,'method':'estimated','confidence':'medium','notes':'Original unnotched west/front edge0–1 faces T6-left/T7-right consistently with the fixed2026 tenant description; front role and seat section interpreted, not surveyed rows.'}}
    zone['surfaces'][0]['frontReference']=next(c['coordinate'] for c in data['corners'] if c['number']==6)
if number=='33':
    uniformRows,uniformRise=rows,rise
    a=(np.array(boundary[10])-origin)*factor;b=(np.array(boundary[11])-origin)*factor
    axis=(b-a)/np.linalg.norm(b-a);normal=np.array([-axis[1],axis[0]])
    if np.dot(np.array(reference.coords)[0]-np.array(shape.centroid.coords)[0],normal)>0:normal=-normal
    maximumDepth=float(max(np.dot((np.array(c)-origin)*factor-a,normal) for c in boundary))
    rows=math.ceil(maximumDepth/.85);rise=round((rows-1)*.4,2)
    assumption={**evidence,'method':'estimated','confidence':'low','notes':'Project assumption0.85m tread/0.4m riser; source footprint truncates shallow banks. These dimensions and maximum row count are not surveyed2026 seating; gallery gives unequal-bank context only.'}
    zone['surfaces'][0].update(rows=rows,rise=rise,rowPitch={'treadMetres':.85,'riserMetres':.4,'source':assumption},rowFrontEdge={'coordinates':[boundary[10],boundary[11]],'source':{**assumption,'notes':'Original long front edge10–11 facing T6–7; rear step in footprint retained.'}},frontReference=next(c['coordinate'] for c in data['corners'] if c['number']==6))
    zone['surface'].update(rise=rise);zone['surfaceSource']=assumption
if previous:
    structural=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
    if structural(zone)==structural(previous['zone']):zone['availability']=previous['zone']['availability'];zone['geometryReview']=previous['zone']['geometryReview']
old14=read('artifacts/goal-review/montreal-width14-standing-metric.json')
assert {k:v for k,v in old14['inputs']['trackGeometry'].items() if k not in ['widthMetres','widthSource']}=={k:v for k,v in data['trackGeometry'].items() if k not in ['widthMetres','widthSource']}
assert old14['inputs']['corners']==data['corners'] and old14['inputs']['elevation']==data['elevation']
roads14=unary_union([Polygon(t) for t in old14['triangles']]);oldShape=Polygon((np.array(old['boundary'])-origin)*factor)
record={'circuitId':'montreal','season':2026,'sourceUrl':evidence['url'],'publicMapUrl':'https://connect.us.app.pam.co/?navmapId=23e3586f-acc5-4f3a-a943-bf4a85884eef','publicDataUrl':retrieval['url'],'publicDataSha256':digest,'sourceFeatureId':feature['id'],'sourceTenantId':tenant['uuid'],
    'annualEvidence':{'welcomeLogoObservedYear':2026,'method':'Manual inspection of public viewer welcome logo, plus explicit2026 experience links in the same snapshot. Upload path/year alone not used.','packageLinks':annualLinks,'localScreenshot':'.tools/montreal-pam-public.png'},
    'sourceBoundary':boundary,'sourceStyleExtrusionHeightIgnored':feature['properties'].get('styleExtrusionHeight'),'geometryFingerprint':hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),
    'roadWidthMetres':10,'minimumDepthMetres':depth,'roadIntersectionMetres2':overlap,'otherIntersections':other,'oldCurrentRoadIntersectionMetres2':oldShape.intersection(roads).area,'sourcePolygonAgainstOld14mRoadMetres2':shape.intersection(roads14).area,'oldPolygonAgainstOld14mRoadMetres2':oldShape.intersection(roads14).area,'oldZone':old,'zone':zone,'inventoryComplete':False,
    'limits':'Official geographic event map is not cadastral seating/height or safety-barrier survey. No logos, media, style definitions or complete raw map dataset redistributed.'}
if number=='34':record['orientationEvidence']={'frontEdgeIndices':[16,17],'namedRoadCorner':10,'gallerySha256':hashlib.sha256(gallery.read_bytes()).hexdigest(),'scope':'Current2027 organizer gallery used for interpreting straight row/front direction only; annual footprint comes from fixed2026 event map. This is not a surveyed2026 seating section.','rejected':'Unconstrained PCA of nearly-square footprint produced oblique, apparently central-rising rows.'}
if number=='31':
    record['identityEvidence']={'sourceTenantIds':[tenantId,duplicate],'orphanTenantId':duplicate,'orphanOccurrences':1,'sourceFeatureIds':[featureId],'sourceBoundaryParts':1,'scope':'Second identical-name tenant is unreferenced metadata, not evidence of a second physical bank.'}
    record['orientationEvidence']={'frontEdgeIndices':[22,23],'namedRoadCorner':8,'gallerySha256':hashlib.sha256(gallery.read_bytes()).hexdigest(),'scope':'Straight row/front interpretation from current2027 organizer gallery and fixed2026 T8–9 description; not a measured annual seating section.'}
if number=='32':record['orientationEvidence']={'frontEdgeIndices':[0,1],'namedRoadCorner':6,'sourceDescription':'Inside circuit; T6 to the left and T7 to the right.','scope':'Original unnotched front interpreted from fixed2026 footprint and named-chicane description; rear notch retained, not a measured seating layout.'}
if number=='33':
    # A maximum-depth bounding rectangle cannot prescribe one row count to
    # both the narrow body and deep end. Keep the factual footprint, but do not
    # promote the provisional uniform section merely because it clears roads.
    a=(np.array(boundary[10])-origin)*factor;b=(np.array(boundary[11])-origin)*factor
    axis=(b-a)/np.linalg.norm(b-a);normal=np.array([-axis[1],axis[0]])
    sections=[]
    for u in [.05,.15,.3,.5,.7,.85,.95]:
        p=a+(b-a)*u
        localDepth=shape.intersection(LineString([p-normal*150,p+normal*150])).length
        sections.append({'frontFraction':u,'depthMetres':localDepth,'provisionalTreadMetres':localDepth/uniformRows})
    reviewed=zone['availability']=='available' and bool(previous and previous.get('sceneAcceptance',{}).get('accepted') and previous.get('profileReview',{}).get('metricModelValidated'))
    if not reviewed:
        zone['availability']='preparing'
        zone['geometryReview']['issues']=['Metric-step replacement requires physical/scene acceptance; rejected uniform42-row profile retained for regression.']
    observations=previous['profileReview']['sourceObservations'] if previous and previous.get('profileReview') else []
    record['profileReview']={'unresolved':not reviewed,'metricModelValidated':reviewed,'sourceFrontEdgeIndices':[10,11],'provisionalRows':uniformRows,'provisionalRiseMetres':uniformRise,'provisionalFrontReference':(origin+np.array(reference.coords)[0]/factor).tolist(),'nominalEstimationTreadMetres':.85,'sections':sections,'minimumSampleTreadMetres':min(s['provisionalTreadMetres'] for s in sections),'sameYearSectionVerified':False,'sourceObservations':observations,'replacementModel':{'type':'metric-front-distance','treadMetres':.85,'riserMetres':.4,'maximumRows':rows,'maximumRiseMetres':rise,'sectionLastRows':[math.floor(s['depthMetres']/.85) for s in sections]},'resolutionScope':'Approximate metre steps resolve compressed model rows only; annual seat/row survey remains unavailable.','nextAction':'Validate shared metric steps, clipped floor/eye rays, inverse picks and three-viewport photos before migration.' if not reviewed else 'Retain estimated-section disclosure; calibrate with annual section data if obtained.'}
if previous and zone['availability']=='available' and previous.get('sceneAcceptance'):record['sceneAcceptance']=previous['sceneAcceptance']
if previous and zone==previous['zone'] and previous.get('candidateReview'):record['candidateReview']=previous['candidateReview']
target.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(json.dumps({k:record[k] for k in ['minimumDepthMetres','roadIntersectionMetres2','oldCurrentRoadIntersectionMetres2','oldPolygonAgainstOld14mRoadMetres2','sourcePolygonAgainstOld14mRoadMetres2','otherIntersections']}))
