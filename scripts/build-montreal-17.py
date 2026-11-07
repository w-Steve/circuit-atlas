"""Extract reviewed additions17/21A/41A; no admission or scene auto-acceptance."""
import hashlib,json,math,sys
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
raw=ROOT/'research/americas/montreal-pam-public/response-1.json'
number=next((a.split('=',1)[1] for a in sys.argv[1:] if a.startswith('--stand=')),'17')
assert number in ['17','21a','41a'],'Only independently sourced additions are supported'
access=read(f'src/circuits/americas/montreal-{number}-access-2026.json')
name={'17':'Grandstand 17','21a':'Grandstand 21A','41a':'Grandstand 41A'}[number]
zoneId=access['productId']
assert hashlib.sha256(raw.read_bytes()).hexdigest()==access['publicMapSha256']
assert access['season']==2026 and (access.get('hospitalityBundleConfirmed') or access.get('unassignedSeating')) and access['modelRequired']
public=read(str(raw.relative_to(ROOT)));tenant=next(t for t in public['tenants'] if t['uuid']==access['sourceTenantId'])
assert tenant['name']==name
if number=='41a':
 location=next(l for l in public['locations'] if l['id']==access['sourceLocationId'])
 assert location['displayText']==access['sourceLocationLabel'] and location['featureId']==access['sourceFeatureId']
 features=[f for f in public['navMap']['features'] if f['id']==location['featureId']]
else:features=[f for f in public['navMap']['features'] if f['properties'].get('tenantId')==tenant['uuid']]
assert len(features)==1 and features[0]['id']==(access.get('sourceFeatureId') or '11f705b7-e9e6-4c64-971e-962415646e60')
f=features[0];assert f['geometry']['type']=='Polygon' and len(f['geometry']['coordinates'])==1
boundary=f['geometry']['coordinates'][0];assert len(boundary)=={'17':31,'21a':23,'41a':5}[number] and boundary[0]==boundary[-1]
data=read('src/circuits/generated/montreal.json');metric=read('artifacts/goal-review/montreal-standing-metric.json')
assert metric['inputs']=={k:data[k] for k in ['trackGeometry','corners','elevation']}
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
shape=Polygon((np.array(boundary)-origin)*factor);assert shape.is_valid
roadArea=shape.intersection(unary_union([Polygon(t) for t in metric['triangles']])).area
assert roadArea<1e-6,'Do not shift the official footprint away from a road conflict'
others=[]
for z in data['spectatorZones']:
 if z['zoneId']==zoneId:continue
 for s in z['surfaces']:
  a=shape.intersection(Polygon((np.array(s['boundary'])-origin)*factor)).area
  if a>1e-6:others.append({'zoneId':z['zoneId'],'areaMetres2':a})
one=next(t for t in public['tenants'] if t['name']=='Grandstand 01')
oneFeatures=[i for i in public['navMap']['features'] if i['properties'].get('tenantId')==one['uuid']]
assert len(oneFeatures)==1 and oneFeatures[0]['geometry']['type']=='Polygon'
oneBoundary=oneFeatures[0]['geometry']['coordinates'][0]
officialOneArea=shape.intersection(Polygon((np.array(oneBoundary)-origin)*factor)).area
assert officialOneArea<1e-6,'Do not resolve an official-boundary conflict by arbitrarily moving either stand'
box=np.array(shape.minimum_rotated_rectangle.exterior.coords)
depth=float(min(np.linalg.norm(b-a) for a,b in zip(box[:-1],box[1:])))
rows=1 if number in ['21a','41a'] else max(2,int(depth/.85));rise=round((rows-1)*.4,2);base=.6 if number in ['21a','41a'] else 2.2
road=LineString(metric['road']+[metric['road'][0]]);ref=road.interpolate(road.project(shape.centroid))
reference=(origin+np.array(ref.coords)[0]/factor).tolist()
source={'url':'https://gpcanada.ca/en/event/site-map/','checkedAt':'2026-10-27','method':'extracted','confidence':'medium','notes':'Fixed organizer PAM snapshot:2026 welcome branding and annual experience links. Exact sourced geographic boundary; no styling assets or seat survey.'}
if number=='41a':
 source['checkedAt']='2026-10-28'
 source['notes']+=' Named organizer location260533 explicitly links the41A unit; unreferenced directory tenant alone was not used to infer geometry.'
if number=='17':source['notes']=source['notes'].replace('Exact sourced geographic boundary;','Exact Grandstand17 geographic boundary;')
surfaceSource={**source,'method':'estimated','confidence':'low','notes':'Independent footprint depth/.85m estimates row count; .4m row rise and2.2m base are project assumptions, not measured2026 seating. Seated eye1.2m.'}
zone={'zoneId':zoneId,'name':name,'kind':'grandstand','availability':'preparing','supportToTerrain':True,'boundary':boundary,'source':source,'boundarySource':source,'openingSource':{**source,'url':access['evidence'][0]['url'],'notes':'2026 sponsor rules confirm Privilege17 bundle with this reserved seat; standalone public sale and exclusivity unverified.'},'surfaceSource':surfaceSource,'admissionNote':'2026贵宾套票座席；普通单售未核实。','surface':{'baseHeight':base,'rise':rise,'depth':depth,'eyeHeight':1.2},'surfaces':[{'surfaceId':zoneId+'-1','boundary':boundary,'baseHeight':base,'rise':rise,'eyeHeight':1.2,'rows':rows,'frontReference':reference}],'geometryReview':{'checkedAt':'2026-10-27','issues':['Shared mesh, facilities and three-viewport scene acceptance pending.'],'method':'Exact map footprint; nearest racing-straight reference; step height estimated, no relocation.'}}
if number in ['21a','41a']:
 zone['admissionNote']='无障碍非编号座席；每位行动不便观众最多一名陪同。'
 zone['openingSource']={**source,'url':access['evidence'][0]['url'],'confidence':'high','notes':'Archived promoter page explicitly branded May22–24 2026: accessible unassigned seating, chairs and one companion per spectator with reduced mobility.'}
 zone['surfaceSource']={**source,'method':'estimated','confidence':'low','notes':'Level accessible platform interpreted from annual unassigned wheelchair-friendly seating.0.6m deck offset is a project assumption, not surveyed height or ramp geometry. Seated eye1.2m.'}
 zone['geometryReview']['method']='Exact geographic footprint; level deck with estimated height; no invented seat rows or relocation.'
if number=='41a':zone['geometryReview']['checkedAt']='2026-10-28'
target=ROOT/f'src/circuits/americas/montreal-{number}-2026.json'
previous=read(str(target.relative_to(ROOT))) if target.exists() else None
structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
if previous and not others and structure(previous['zone'])==structure(zone):
 zone['availability']=previous['zone']['availability'];zone['geometryReview']=previous['zone']['geometryReview']
record={'circuitId':'montreal','season':2026,'sourceUrl':source['url'],'publicDataSha256':access['publicMapSha256'],'sourceTenantId':tenant['uuid'],'sourceFeatureId':f['id'],'sourceBoundary':boundary,'sourceStyleExtrusionHeightIgnored':f['properties'].get('styleExtrusionHeight'),'geometryFingerprint':hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),'roadIntersectionMetres2':roadArea,'otherIntersections':others,'minimumDepthMetres':depth,'oldZone':None,'addition':True,'accessReview':access,'zone':zone,'inventoryComplete':False,'limits':'Added physical product, not a replacement. Map category does not grant ordinary access; seating/base assumptions disclosed; preserve actual fences and natural seated occlusion.'}
record['blockingReview']={'unresolved':bool(others),'conflicts':others,'officialGrandstand1':{'tenantId':one['uuid'],'featureId':oneFeatures[0]['id'],'boundary':oneBoundary,'intersectionWith17Metres2':officialOneArea},'nextAction':'Replace the conflicting old Grandstand1 approximation using its independent official boundary, then regenerate and validate17; never shrink, shift or clip17 to fit the old model.' if others else 'Validate facilities, physical mesh and desktop/tablet/mobile before scene acceptance.'}
if number=='41a':record.update(sourceLocationId=location['id'],sourceLocationLabel=location['displayText'],sourceLinkMethod='named-location-featureId')
if previous:
 original=previous.get('originalBlockingReview') or previous.get('blockingReview')
 if original and original.get('unresolved'):record['originalBlockingReview']=original
if number in ['21a','41a']:record['blockingReview'].pop('officialGrandstand1',None)
if zone['availability']=='available':record['blockingReview']['nextAction']=('Retain accessible-seating limits and estimated platform height; exact ramp/deck survey remains unavailable.' if number in ['21a','41a'] else 'Retain estimated-section and verified-bundle admission notes; standalone sale and full inventory remain separate evidence tasks.')
if others:zone['geometryReview']['issues']=['Official17 footprint intersects the old Grandstand1 model; independent official1 and17 boundaries are disjoint. Repair1 before accepting17.']
if previous and zone['availability']=='available' and previous.get('sceneAcceptance'):record['sceneAcceptance']=previous['sceneAcceptance']
target.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(f'{number}:{len(boundary)} source points, depth {depth:.2f}m, estimated {rows} rows/{rise}m rise; road overlap {roadArea:.6f}m2; other overlaps {len(others)}; {zone["availability"]}')
