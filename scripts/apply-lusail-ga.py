"""Replay retained public-ground coordinates without downloading organizer art."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'src/circuits/asia/lusail-general-admission.json').read_text('utf8'))
path=root/'src/circuits/generated/lusail.json';data=json.loads(path.read_text('utf8'))
ids={z['zoneId'] for z in config['zones']}
data['spectatorZones']=[z for z in data['spectatorZones'] if z['zoneId'] not in ids]+config['zones']
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
path=root/'src/circuits/generated/summaries.json';summaries=json.loads(path.read_text('utf8'))
summary=next(s for s in summaries if s['circuitId']=='lusail')
if summary.get('spectatorZoneIds')!=data['spectatorZoneIds']:
    summary['spectatorZoneIds']=data['spectatorZoneIds']
    path.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
