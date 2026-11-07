"""Replay permanent G bank interpretation; no organizer artwork is required."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'src/circuits/asia/suzuka-g-permanent.json').read_text('utf8'))
path=root/'src/circuits/generated/suzuka.json';data=json.loads(path.read_text('utf8'))
data['spectatorZones']=[config['zone'] if z['zoneId']=='g' else z for z in data['spectatorZones']]
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
