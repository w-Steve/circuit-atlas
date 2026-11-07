"""Record annual GA rights and exclusions without inventing selectable ground."""
import hashlib,json,re
from html import unescape
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
rawPath=ROOT/'research/americas/montreal-pam-public/response-1.json'
digest=hashlib.sha256(rawPath.read_bytes()).hexdigest()
assert digest=='0112b4db9bf3fc43ce2e531b49a4c0576f9aec72421aded085a340003a349f42'
raw=read(str(rawPath.relative_to(ROOT)))
ticketPath=ROOT/'research/americas/montreal-ga/ticket-20260413.html'
ticketSha=hashlib.sha256(ticketPath.read_bytes()).hexdigest()
assert ticketSha=='e993a1d3949b6586556fdcce35fa32d1d3458c95d802cbf652a9e31f563faea0'
text=re.sub(r'<(script|style)\b[^>]*>.*?</\1>','',ticketPath.read_text('utf8'),flags=re.S|re.I)
text=re.sub(r'\s+',' ',unescape(re.sub('<[^>]+>',' ',text)))
assert all(clause in text for clause in ['May 22-23-24 2026','No reserved seats or grandstand entry','All general admission zones except Blue Zone and VIP sections','All zones except Senna Zone and VIP sections'])
tenant=next(t for t in raw['tenants'] if t['name']=='General Admission')
assert tenant['uuid']=='cb8d0198-879d-47de-bf32-190f66fa6394'
direct=[f for f in raw['navMap']['features'] if f['properties'].get('tenantId')==tenant['uuid']]
named=[l for l in raw['locations'] if re.search(r'\b(general admission|ground pass|admission g[eé]n[eé]rale|GA)\b',' '.join(l.get(k,'') for k in ['displayText','displayTextDefaultLocale','mapLabelText']),re.I)]
assert not direct and not named,'Inspect newly present positive GA geometry before repeating this report'
blue=next(l for l in raw['locations'] if l['id']==111295)
assert blue['displayText']==blue['mapLabelText']=='Blue Zone'
feature=next(f for f in raw['navMap']['features'] if f['id']==blue['featureId'])
assert feature['id']=='365a7969-26da-4f3d-bab5-d28af1ca353e' and feature['geometry']['type']=='Polygon'
assert len(feature['geometry']['coordinates'])==1
boundary=feature['geometry']['coordinates'][0];assert len(boundary)==88 and boundary[0]==boundary[-1]
accessZones=[{'locationId':l['id'],'label':l['displayText'],'sourceFeatureId':l['featureId'],'role':'access-zone-not-selectable-viewing-ground'} for l in raw['locations'] if l.get('dictionaryCategoryName')=='Zones' and l.get('displayText') in ['Green Zone','Orange Zone','Pink Zone','Red Zone','Yellow Zone']]
assert len(accessZones)==5
record={'circuitId':'montreal','season':2026,'productId':'general-admission','checkedAt':'2026-10-28','sourceTenantId':tenant['uuid'],'publicMapSha256':digest,
 'evidence':{'url':'https://web.archive.org/web/20260413110837id_/https://gpcanada.ca/en/tickets/general-admission/','originalUrl':tenant['website'],'archiveTimestamp':'20260413110837','observedSeason':2026,'annualHeader':'May 22-23-24 2026','sha256':ticketSha},
 'reservedSeatsIncluded':False,'grandstandAdmissionIncluded':False,'standingEyeHeightMetres':1.65,
 'publishedExclusionNames':['Blue Zone','VIP sections','Senna Zone'],
 'excludedAccessAreas':[{'label':'Blue Zone','sourceLocationId':blue['id'],'sourceFeatureId':feature['id'],'boundary':boundary,'role':'negative-exclusion-only','selectable':False}],
 'accessZonesNotViewingBoundaries':accessZones,'namedGALocationCount':len(named),'directTenantLinkedFeatures':len(direct),
 'geometryValidated':False,'acceptedViewingBoundaries':[],'runtimeModelZoneIds':[],'modelRequired':True,'simulationAvailability':'preparing',
 'nextAction':'Obtain positive designated GA viewing boundaries from an annual organizer map or equivalent primary evidence. Use the published Blue/VIP exclusions, but never turn all remaining colored zones, grass or entrance points into selectable viewing ground.',
 'limits':'One annual page uses Blue Zone in the main copy and Senna Zone in a lower access block. Both wordings retained; no exact geographic equivalence asserted. VIP boundaries and positive GA viewing patches remain unresolved. Access rights, a negative polygon and general event zones cannot establish a selectable viewing footprint. No runtime area created by this audit.'}
(ROOT/'src/circuits/americas/montreal-ga-access-2026.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
print('2026 GA rights verified; Blue88-point exclusion and5 non-viewing access zones recorded;0 positive viewing boundaries, no runtime changes.')
