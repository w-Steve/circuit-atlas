"""One bounded read-only query for all withheld stand surroundings.
Native objects are evidence candidates, never automatic ticket assignments.
Raw responses stay in research; no runtime data are modified.
"""
import hashlib,json,math,sys
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
areas=[];clauses=[]
for path in sorted((ROOT/'src/circuits/generated').glob('*.json')):
 data=json.loads(path.read_text('utf8'))
 if not isinstance(data,dict) or 'spectatorZones' not in data:continue
 for zone in data['spectatorZones']:
  if zone['availability']=='available':continue
  points=zone['boundary'];lat=sum(p[1] for p in points)/len(points)
  dx=250/(111320*math.cos(math.radians(lat)));dy=250/111320
  bbox=[min(p[1] for p in points)-dy,min(p[0] for p in points)-dx,max(p[1] for p in points)+dy,max(p[0] for p in points)+dx]
  box=','.join(f'{n:.7f}' for n in bbox)
  clauses.extend([f'way["building"="grandstand"]({box});',f'way["leisure"="bleachers"]({box});'])
  areas.append(dict(circuitId=data['circuitId'],zoneId=zone['zoneId'],bbox=bbox))
assert 0<len(areas)<=200,'Unexpected review scope; check registry before querying'
query='[out:json][timeout:60];('+''.join(clauses)+');out tags geom;'
endpoint='https://overpass-api.de/api/interpreter'
endpoint=next((arg.split('=',1)[1] for arg in sys.argv if arg.startswith('--endpoint=')),endpoint)
cached='--cached' in sys.argv
if cached:
 objects={}
 for path in (ROOT/'src/circuits').glob('*/osm/*-osm.json'):
  raw=path.read_bytes();data=json.loads(raw)
  for e in data.get('elements',[]):
   tags=e.get('tags',{});points=e.get('geometry',[])
   if e.get('type')!='way' or not points or not(tags.get('building')=='grandstand' or tags.get('leisure')=='bleachers'):continue
   matches=[a for a in areas if any(a['bbox'][0]<=p['lat']<=a['bbox'][2] and a['bbox'][1]<=p['lon']<=a['bbox'][3] for p in points)]
   if matches:objects[e['id']]={**e,'retainedSourceFile':str(path.relative_to(ROOT)).replace('\\','/'),'retainedSourceSha256':hashlib.sha256(raw).hexdigest(),'nearbyReviewAreas':[{'circuitId':a['circuitId'],'zoneId':a['zoneId']} for a in matches]}
 body={'elements':list(objects.values())};content=json.dumps(body,ensure_ascii=False).encode()
else:
 response=requests.post(endpoint,data={'data':query},proxies={'https':'http://127.0.0.1:7890'},timeout=80)
 if response.status_code==406:response=requests.get(endpoint,params={'data':query},proxies={'https':'http://127.0.0.1:7890'},timeout=80)
 if response.status_code!=200:raise SystemExit(f'Overpass HTTP{response.status_code}; use --cached to inspect retained snapshots without claiming freshness.')
 body=response.json();content=response.content;assert isinstance(body.get('elements'),list)
folder=ROOT/'research/season-review/withheld-native-20261029';folder.mkdir(parents=True,exist_ok=True)
(folder/('cached-response.json' if cached else 'response.json')).write_bytes(content)
(folder/'query.overpass').write_text(query,'utf8')
metadata=dict(checkedAt='2026-10-29',mode='retained snapshots; freshness unverified' if cached else 'live',endpoint=endpoint,querySha256=hashlib.sha256(query.encode()).hexdigest(),responseSha256=hashlib.sha256(content).hexdigest(),osmTimestamp=body.get('osm3s',{}).get('timestamp_osm_base'),areas=areas,objectCount=len(body['elements']),runtimeApplied=False,scope='250m vicinity of current withheld records. Native presence does not establish2026 admission, name association, seating elevations or public access.')
(folder/'meta.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n','utf8')
print(json.dumps(dict(areas=len(areas),circuits=len({a['circuitId'] for a in areas}),objects=len(body['elements']),bytes=len(content),mode=metadata['mode'],runtimeApplied=False)))
