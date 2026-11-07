"""Apply source-derived Austin standing ground with strict geometry/version guards."""
import hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=json.loads((ROOT/'src/circuits/americas/austin-ground-2026.json').read_text('utf8'))
path=ROOT/'src/circuits/generated/austin.json';data=json.loads(path.read_text('utf8'))
fingerprint=hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
if fingerprint!=source['geometryFingerprint']:raise ValueError('Road/corners/terrain changed after source review; re-export and rebuild')
if any(a['issues'] for a in source['areas']):raise ValueError('Resolve source footprint conflicts before applying')
preview='--preview' in sys.argv
if not preview and any(z['availability']=='available' for z in source['zones']) and not source.get('sceneAcceptance',{}).get('accepted'):raise ValueError('Do not open unaccepted GA candidates')
structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
for z in source['zones']:
 current=next((a for a in data['spectatorZones'] if a['zoneId']==z['zoneId']),None)
 if current and structure(current)!=structure(z):raise ValueError('Preserve edited GA region: '+z['zoneId'])
 if preview:z['availability']='available'
 data['spectatorZones']=[a for a in data['spectatorZones'] if a['zoneId']!=z['zoneId']]+[z]
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
opening=source['zones'][0]['openingSource']
if not any(s['url']==opening['url'] for s in data['dataSources']):data['dataSources'].append(opening)
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
path=ROOT/'src/circuits/generated/summaries.json';summaries=json.loads(path.read_text('utf8'));next(s for s in summaries if s['circuitId']=='austin')['spectatorZoneIds']=data['spectatorZoneIds'];path.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
