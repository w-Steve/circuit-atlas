"""B source triage and metadata-only correction of its stale collision warning."""
import copy,hashlib,json,xml.etree.ElementTree as ET
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'research/season-review/monaco2026'
read=lambda p:json.loads(p.read_text('utf8'))
def evidence(name,meta):
    b=(RAW/name).read_bytes();m=read(RAW/meta)
    assert hashlib.sha256(b).hexdigest()==m['sha256']
    return b,m

xml,osm=evidence('b-osm-map.xml','b-osm-map-fetch.json')
assert osm['status']==200
tree=ET.fromstring(xml);matches=[]
for item in tree:
    tags={t.attrib['k']:t.attrib['v'] for t in item.findall('tag')}
    if any('grandstand' in v.lower() or 'tribune' in v.lower() for v in tags.values()):
        matches.append({'type':item.tag,'id':item.attrib['id']})
assert not matches,'Reinspect new possible stand records'
_,post=evidence('b-osm-query.json','b-osm-query-fetch.json')
_,get=evidence('b-osm-get.json','b-osm-get-fetch.json')
assert post['status']==get['status']==406
webmap,wm=evidence('b-story-webmap.json','b-story-webmap-fetch.json')
assert read(RAW/'b-story-webmap.json')['error']['code']==400
assert '6ddb2d0081f34d47a719dcb86680e6b3' in wm['url']
guide=(RAW/'b-guide-lead.html').read_bytes()
assert hashlib.sha256(guide).hexdigest()=='35628125f163968b0b93b7598c5ebf24a1674577cd44a33a7c77b18588c3687f'
assert b'/2025/01/Grandstand-B-seating-plan' in guide

source=read(ROOT/'src/circuits/europe/monaco-b-2026.json')
path=ROOT/'src/circuits/generated/monaco.json';data=read(path)
assert source['circuitId']=='monaco' and source['season']==data['season']==2026,'Source circuit/season mismatch'
assert hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()==source['geometryFingerprint']
zone=next(z for z in data['spectatorZones'] if z['zoneId']=='b-casino')
structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
assert structure(zone)==structure(source['oldZone']),'Do not annotate a different or migrated B model'
assert zone['availability']=='preparing' and source['oldCurrentRoadIntersectionMetres2']==0
before=copy.deepcopy(zone)
zone['geometryReview']={'checkedAt':'2026-10-27',
    'issues':['Manual rectangle differs from the official2026 trapezoid; candidate row/deck profile and foundation datum remain unverified.'],
    'method':'Current10m road check supersedes stale14.47m2 intersection warning. No footprint, eye, row or terrain changed; source-derived candidate remains isolated.'}
assert structure(zone)==structure(before)
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
report={'circuitId':'monaco','season':2026,'checkedAt':'2026-10-27','zoneId':'b-casino',
 'profileVerified':False,'runtimeGeometryChanged':False,
 'sources':{
  'osmSnapshot':{'url':osm['url'],'sha256':osm['sha256'],'mappedObjects':sum(item.tag in ['node','way','relation'] for item in tree),'identifiedStandMatches':matches,
   'limitation':'Current mapped tags in this bbox only; not proof a temporary2026 stand was absent, and no unlabeled building is substituted.'},
  'overpass':{'url':post['url'],'postStatus':post['status'],'getStatus':get['status'],'limitation':'406 is a fetch failure, not an empty dataset.'},
  'storyWebmap':{'url':wm['url'],'sha256':wm['sha256'],'errorCode':400,'limitation':'Missing or inaccessible; no seat/height data obtained. StoryMap owner name alone does not certify an official2026 stand section.'},
  'secondarySeatPlanLead':{'url':'https://oversteer48.com/grandstand-b-monaco-grand-prix/','sha256':hashlib.sha256(guide).hexdigest(),
   'assetPath':'/wp-content/uploads/2025/01/Grandstand-B-seating-plan.jpg','acceptedFor2026Profile':False,
   'limitation':'Upload path is not capture/applicability date. No authenticated2026 row count, metric riser, tread or platform height.'}},
 'nextAction':'Obtain a dated official/supplier Casino seating section and foundation datum. Avoid repeated requests to the inaccessible webmap; continue independent Monaco regions meanwhile.'}
(ROOT/'src/circuits/season-review/monaco-b-source-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print('B stale road warning replaced; geometry/availability unchanged; checked sources do not verify its section')
