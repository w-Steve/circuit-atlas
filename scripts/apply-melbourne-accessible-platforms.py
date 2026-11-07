"""Apply only the three source-derived platforms, with explicit preview gating."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=json.loads((ROOT/'src/circuits/asia/melbourne-accessible-platforms-2026.json').read_text('utf8'))
if any(a['issues'] for a in source['areas']):raise ValueError('Resolve known platform conflicts before applying')
preview='--preview' in sys.argv
if not preview and any(z['availability']=='available' for z in source['zones']) and not source.get('sceneAcceptance',{}).get('accepted'):raise ValueError('Unaccepted accessible platform')
path=ROOT/'src/circuits/generated/melbourne.json';data=json.loads(path.read_text('utf8'))
structural=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
for zone in source['zones']:
 current=next((z for z in data['spectatorZones'] if z['zoneId']==zone['zoneId']),None)
 if current and structural(current)!=structural(zone):raise ValueError('Preserve edited platform: '+zone['zoneId'])
 if preview:zone['availability']='available'
 data['spectatorZones']=[z for z in data['spectatorZones'] if z['zoneId']!=zone['zoneId']]+[zone]
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
opening=source['zones'][0]['openingSource']
if not any(s['url']==opening['url'] for s in data['dataSources']):data['dataSources'].append(opening)
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
p=ROOT/'src/circuits/generated/summaries.json';summaries=json.loads(p.read_text('utf8'));next(s for s in summaries if s['circuitId']=='melbourne')['spectatorZoneIds']=data['spectatorZoneIds'];p.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
