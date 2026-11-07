"""Reconcile map identities only; never grants access or scene acceptance."""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
path=ROOT/'research/americas/montreal-pam-public/response-1.json'
digest=hashlib.sha256(path.read_bytes()).hexdigest()
assert digest=='0112b4db9bf3fc43ce2e531b49a4c0576f9aec72421aded085a340003a349f42'
source=read('src/circuits/americas/montreal-16-2026.json')
assert source['season']==2026 and source['publicDataSha256']==digest
assert source['annualEvidence']['welcomeLogoObservedYear']==2026 and len(source['annualEvidence']['packageLinks'])==2
raw=json.loads(path.read_text('utf8'));assert raw['clientId']=='F1GPCAN'
data=read('src/circuits/generated/montreal.json');assert data['circuitId']=='montreal' and data['season']==2026
tenants={}
for t in raw['tenants']:
    if t['category']['name']=='Grandstands' or t['name']=='General Admission':tenants.setdefault(t['name'],[]).append(t)
aliases={'grandstand-1':'Grandstand 01','lance-stroll-24':'Grandstand 24','platine':'Platine Grandstand'}
confirmed=[];modeled=set()
def evidence(name):
    ids={t['uuid'] for t in tenants[name]}
    features=[f for f in raw['navMap']['features'] if f['properties'].get('tenantId') in ids]
    locationIds=[]
    if name=='Grandstand 41A':
        # The directory tenant is unreferenced, but the organizer's independently
        # named location explicitly links its physical unit. No proximity guess.
        location=next(l for l in raw['locations'] if l['id']==260533)
        assert location['displayText']==location['mapLabelText']=='Accessible Grandstand 41A'
        assert location['featureId']=='c202a180-6aae-42a7-95a6-33bd69ca8734'
        features=[f for f in raw['navMap']['features'] if f['id']==location['featureId']]
        assert len(features)==1 and features[0]['geometry']['type']=='Polygon'
        locationIds=[location['id']]
    result={'sourceTenantIds':sorted(ids),'sourceFeatureIds':sorted(f['id'] for f in features),'sourceBoundaryParts':sum(len(f['geometry']['coordinates']) if f['geometry']['type']=='MultiPolygon' else 1 for f in features if f['geometry']['type'] in ['Polygon','MultiPolygon'])}
    if locationIds:result['sourceLocationIds']=locationIds
    return result
for z in data['spectatorZones']:
    name=aliases.get(z['zoneId'],z['name']);assert name in tenants,f'Unmatched runtime identity: {name}'
    assert name not in modeled,'Duplicate modeled product';modeled.add(name)
    confirmed.append({'zoneId':z['zoneId'],'mapLabel':name,'ticketClass':'grandstand',**evidence(name)})
missing=[]
for name in sorted(set(tenants)-modeled):
    ticketClass='general-admission' if name=='General Admission' else 'grandstand'
    accessible=any('/accessibility/' in t.get('website','') for t in tenants[name])
    missing.append({'productId':name.lower().replace(' ','-'),'mapLabel':name,'ticketClass':ticketClass,'modelZoneId':None,**evidence(name),'accessibilityLinked':accessible,'nextAction':'Verify annual eligibility/platform/companion rules and source boundary before modeling.' if accessible else 'Identify actual geographic viewing boundaries and ground/occlusion before modeling; a map point or green ground is not a selectable ticket area.','candidateAccepted':False})
access=read('src/circuits/americas/montreal-17-access-2026.json')
assert access['circuitId']=='montreal' and access['season']==2026 and access['publicMapSha256']==digest
assert access['sourceTenantId'] in evidence('Grandstand 17')['sourceTenantIds']
assert access['modelRequired'] and not access['candidateAccepted']
item=next((p for p in missing if p['productId']==access['productId']),None)
isModeled=item is None
if isModeled:item=next(p for p in confirmed if p['zoneId']==access['productId'])
item['accessReview']=access
item['nextAction']=access['nextAction']
candidatePath=ROOT/'src/circuits/americas/montreal-17-2026.json'
assert not isModeled or candidatePath.exists(),'Modeled17 requires its independent accepted source'
if candidatePath.exists():
    candidate=read(str(candidatePath.relative_to(ROOT)))
    assert candidate['sourceTenantId']==access['sourceTenantId'] and candidate['publicDataSha256']==digest
    if isModeled:
        assert candidate.get('sceneAcceptance',{}).get('accepted') and not candidate['blockingReview']['unresolved']
        assert candidate['zone']==next(z for z in data['spectatorZones'] if z['zoneId']==access['productId'])
    item['candidateGeometryReview']={'sourceFile':str(candidatePath.relative_to(ROOT)).replace('\\','/'),'sourceBoundaryPoints':len(candidate['sourceBoundary']),'roadIntersectionMetres2':candidate['roadIntersectionMetres2'],'blockingReview':candidate['blockingReview']}
    item['nextAction']=candidate['blockingReview']['nextAction']
for number in ['21a','41a']:
    platformAccess=read(f'src/circuits/americas/montreal-{number}-access-2026.json')
    platform=next((p for p in missing if p['productId']==platformAccess['productId']),None)
    if platform is None:
        platform=next(p for p in confirmed if p['zoneId']==platformAccess['productId'])
        accepted=read(f'src/circuits/americas/montreal-{number}-2026.json')
        assert accepted.get('sceneAcceptance',{}).get('accepted') and not accepted['blockingReview']['unresolved']
        assert accepted['zone']==next(z for z in data['spectatorZones'] if z['zoneId']==platformAccess['productId'])
        platform.update(ticketClass='accessible-grandstand',accessibilityLinked=True)
    assert platformAccess['sourceTenantId'] in platform['sourceTenantIds'] and platformAccess['publicMapSha256']==digest
    assert platformAccess['evidence'][0]['observedSeason']==2026
    platform['accessReview']=platformAccess
gaPath='src/circuits/americas/montreal-ga-access-2026.json'
ga=read(gaPath)
assert ga['season']==2026 and ga['publicMapSha256']==digest and ga['evidence']['observedSeason']==2026
assert not ga['geometryValidated'] and not ga['acceptedViewingBoundaries']
assert not any(z['kind'] in ['grass','general-admission'] for z in data['spectatorZones']),'Positive GA boundaries require independent source and scene acceptance, not the general event access envelope'
gaItem=next(p for p in missing if p['productId']=='general-admission')
gaItem['accessReview']={'sourceFile':gaPath,'reservedSeatsIncluded':False,'grandstandAdmissionIncluded':False,'geometryValidated':False,'excludedAreaFeatureIds':[p['sourceFeatureId'] for p in ga['excludedAccessAreas']],'positiveViewingBoundaryCount':0}
gaItem['nextAction']=ga['nextAction']
report={'circuitId':'montreal','season':2026,'checkedAt':'2026-10-28','sourceUrl':source['sourceUrl'],'sourceSha256':digest,'annualEvidence':source['annualEvidence'],'method':'Fixed official public map snapshot: exact Grandstands tenant names; duplicate31 tenants grouped as one named product, not two tickets. Identity matching does not validate existing geometry.','confirmedIdentities':confirmed,'unresolvedIdentities':[],'confirmedMissingProducts':missing,'inventoryComplete':False,'limits':'2027 outer website and2026 embedded-map branding are distinct. GA rules and Blue exclusion are verified separately; positive viewing boundaries remain unavailable.21A/41A rules verified against the2026 promoter archive. No raw map assets redistributed.'}
(ROOT/'src/circuits/season-review/montreal-public-map-identity-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print(f'{len(confirmed)} runtime identities matched; {len(missing)} source products missing models; no availability changes')
