"""Validate registry availability against independent current circuit packages."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'src/circuits/generated/summaries.json'
rows=json.loads(p.read_text('utf8'));changed=[]
assert len(rows)==23 and len({r['circuitId'] for r in rows})==23
for row in rows:
 cid=row['circuitId'];assert '/' not in cid and '\\' not in cid
 data=json.loads((p.parent/(cid+'.json')).read_text('utf8'))
 assert data['circuitId']==cid and data['season']==2026
 ids=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
 assert len(ids)==len(set(ids)) and data['spectatorZoneIds']==ids
 if row['spectatorZoneIds']!=ids:changed.append(cid);row['spectatorZoneIds']=ids
if changed and '--write' not in sys.argv:raise SystemExit('Registry drift: '+', '.join(changed))
if changed:p.write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print('23 circuit registry entries match current available zones'+(': updated '+', '.join(changed) if changed else ''))
