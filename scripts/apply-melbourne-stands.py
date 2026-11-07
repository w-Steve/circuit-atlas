"""Apply source-derived 2026 stands, retaining guarded prior geometry."""
import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=json.loads((root/'src/circuits/asia/melbourne-stands-2026.json').read_text('utf8'))
p=root/'src/circuits/generated/melbourne.json';data=json.loads(p.read_text('utf8'))
replacement={z['zoneId']:z for z in source['zones']}
for old in source['replacedZones']+source.get('t8Migration',{}).get('previousAcceptedZones',[])+source.get('curvedRowMigration',{}).get('previousAcceptedZones',[]):
 current=next(z for z in data['spectatorZones'] if z['zoneId']==old['zoneId'])
 structural=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
 candidate=current['availability']=='preparing' and current['source']==replacement[old['zoneId']]['source'] and current.get('surfaceSource')==replacement[old['zoneId']].get('surfaceSource') and current.get('geometryReview',{}).get('method')=='Source geometry retained without translation, shrinkage or visibility-driven height changes.'
 previous=next((z for z in source.get('curvedRowMigration',{}).get('previousAcceptedZones',[])+source.get('t8Migration',{}).get('previousAcceptedZones',[]) if z['zoneId']==old['zoneId']),None)
 if not candidate and structural(current)!=structural(old) and structural(current)!=structural(replacement[old['zoneId']]) and (previous is None or structural(current)!=structural(previous)):raise ValueError('Existing accepted stand changed; review before migration: '+old['zoneId'])
if '--preview' in sys.argv:
 for z in replacement.values():z['availability']='available'
data['spectatorZones']=[replacement.pop(z['zoneId'],z) for z in data['spectatorZones']]+list(replacement.values())
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
p=root/'src/circuits/generated/summaries.json';summaries=json.loads(p.read_text('utf8'))
summary=next(s for s in summaries if s['circuitId']=='melbourne')
if summary['spectatorZoneIds']!=data['spectatorZoneIds']:
 summary['spectatorZoneIds']=data['spectatorZoneIds'];p.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
