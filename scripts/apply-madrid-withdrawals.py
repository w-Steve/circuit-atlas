"""Withdraw exactly archived invalid public interpretations, retaining all valid models."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
record=json.loads((ROOT/'src/circuits/season-review/madrid-withdrawn-public-models.json').read_text('utf8'))
path=ROOT/'src/circuits/generated/madrid.json';data=json.loads(path.read_text('utf8'))
for entry in record['withdrawn']:
 current=next((z for z in data['spectatorZones'] if z['zoneId']==entry['zoneId']),None)
 assert current is None or current==entry['originalZone'],'Preserve independently edited model'
 assert entry['originalZone']['availability']!='available','Do not silently remove an active bank'
 data['spectatorZones']=[z for z in data['spectatorZones'] if z['zoneId']!=entry['zoneId']]
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
path=ROOT/'src/circuits/generated/summaries.json';summaries=json.loads(path.read_text('utf8'))
next(s for s in summaries if s['circuitId']=='madrid')['spectatorZoneIds']=data['spectatorZoneIds']
path.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
