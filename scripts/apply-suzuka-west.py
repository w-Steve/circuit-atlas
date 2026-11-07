"""Replay west-ground facts; --preview temporarily enables local acceptance only."""
import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'src/circuits/asia/suzuka-west-ground.json').read_text('utf8'))
zones=config['zones']
if '--preview' in sys.argv:
 zones=[{**z,'availability':'available'} for z in zones]
path=root/'src/circuits/generated/suzuka.json';data=json.loads(path.read_text('utf8'))
ids={z['zoneId'] for z in zones}
data['spectatorZones']=[z for z in data['spectatorZones'] if z['zoneId'] not in ids]+zones
for entry in [zones[0]['source'],zones[0]['openingSource']]:
 if not any(s['url']==entry['url'] for s in data['dataSources']):data['dataSources'].append(entry)
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
path=root/'src/circuits/generated/summaries.json';rows=json.loads(path.read_text('utf8'));row=next(r for r in rows if r['circuitId']=='suzuka')
if row.get('spectatorZoneIds')!=data['spectatorZoneIds']:
 row['spectatorZoneIds']=data['spectatorZoneIds'];path.write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')),'utf8')
