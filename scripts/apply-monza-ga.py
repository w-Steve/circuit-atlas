"""Replay retained2026 P area coordinates without downloading organizer artwork."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'src/circuits/europe/monza-general-admission.json').read_text('utf8'))
path=root/'src/circuits/generated/monza.json';data=json.loads(path.read_text('utf8'))
supplement_file=root/'src/circuits/europe/monza-supplement-2026.json'
if supplement_file.exists():
    supplement=json.loads(supplement_file.read_text('utf8'))
    revised={z['zoneId']:z for z in supplement['zones'] if z['kind']!='grandstand'}
    for original in config['zones']:
        current=next((z for z in data['spectatorZones'] if z['zoneId']==original['zoneId']),None)
        if current is not None and current!=original and current!=revised.get(original['zoneId']):
            raise ValueError('Preserve independently edited Monza ground '+original['zoneId'])
    config['zones']=[revised.get(z['zoneId'],z) for z in config['zones']]
ids={z['zoneId'] for z in config['zones']}
data['spectatorZones']=[z for z in data['spectatorZones'] if z['zoneId'] not in ids]+config['zones']
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
path=root/'src/circuits/generated/summaries.json';summaries=json.loads(path.read_text('utf8'));summary=next(s for s in summaries if s['circuitId']=='monza')
if summary.get('spectatorZoneIds')!=data['spectatorZoneIds']:
    summary['spectatorZoneIds']=data['spectatorZoneIds'];path.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
