"""Withhold known wrong prototypes without moving or overwriting their geometry."""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
r=read('src/circuits/europe/silverstone-boxpark-2026.json');d=read('src/circuits/generated/silverstone.json')
assert r['circuitId']==d['circuitId']=='silverstone' and r['season']==d['season']==2026
keys=['name','availability','openingSource','admissionNote','geometryReview']
for a in r['areas']:
 assert not a['geometryAccepted'] and a['newMetadata']['availability']=='preparing'
 z=next(z for z in d['spectatorZones'] if z['zoneId']==a['zoneId'])
 physical={k:v for k,v in z.items() if k not in keys}
 assert hashlib.sha256(json.dumps(physical,sort_keys=True,separators=(',',':')).encode()).hexdigest()==a['physicalFingerprint'],'Preserve independent physical changes; review source again'
 current={k:z[k] for k in keys if k in z}
 assert current in [a['oldMetadata'],a['newMetadata']],'Preserve independent metadata changes'
 z.update(a['newMetadata'])
d['spectatorZoneIds']=[z['zoneId'] for z in d['spectatorZones'] if z['availability']=='available']
summaries=read('src/circuits/generated/summaries.json');next(s for s in summaries if s['circuitId']=='silverstone')['spectatorZoneIds']=d['spectatorZoneIds']
(ROOT/'src/circuits/generated/silverstone.json').write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')),'utf8')
(ROOT/'src/circuits/generated/summaries.json').write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
