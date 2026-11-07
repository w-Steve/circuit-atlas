"""Apply the source-derived Z migration; preview requires an explicit flag."""
import hashlib,json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=json.loads((root/'src/circuits/europe/monaco-standing-world.json').read_text('utf8'))
if source['issues']:raise ValueError('Resolve source geometry before applying')
p=root/'src/circuits/generated/monaco.json';data=json.loads(p.read_text('utf8'));new=source['zones'][0]
fingerprint=hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
if fingerprint!=source['geometryFingerprint']:raise ValueError('Road or terrain changed after registration review; rebuild before applying')
if new['availability']=='available' and '--preview' not in sys.argv and not source.get('sceneAcceptance',{}).get('accepted'):raise ValueError('Do not enable an unaccepted default scene')
current=next(z for z in data['spectatorZones'] if z['zoneId']==new['zoneId'])
structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
allowed=[structure(source['previousZone']),structure(new)]
if source.get('previousDraftZone'):allowed.append(structure(source['previousDraftZone']))
if source.get('previousAcceptedZone'):allowed.append(structure(source['previousAcceptedZone']))
if structure(current) not in allowed:raise ValueError('Existing Z changed; do not overwrite user geometry')
if '--preview' in sys.argv:new['availability']='available'
data['spectatorZones']=[new if z['zoneId']==new['zoneId'] else z for z in data['spectatorZones']]
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
if not any(s['url']==new['openingSource']['url'] for s in data['dataSources']):data['dataSources'].append(new['openingSource'])
p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
p=root/'src/circuits/generated/summaries.json';summaries=json.loads(p.read_text('utf8'))
next(s for s in summaries if s['circuitId']=='monaco')['spectatorZoneIds']=data['spectatorZoneIds']
p.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
