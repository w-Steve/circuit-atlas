"""Replay the retained official-map GA interpretation without fetching artwork."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'src/circuits/europe/zandvoort-general-admission.json').read_text('utf8'))
path=root/'src/circuits/generated/zandvoort.json'
data=json.loads(path.read_text('utf8'))
ids={z['zoneId'] for z in config['zones']}
data['spectatorZones']=[z for z in data['spectatorZones'] if z['zoneId'] not in ids]+config['zones']
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
