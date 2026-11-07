"""Keep historical stand facts without advertising unsupported2026 eligibility."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
review=json.loads((root/'src/circuits/asia/melbourne-season-2026.json').read_text('utf8'))
p=root/'src/circuits/generated/melbourne.json';data=json.loads(p.read_text('utf8'))
excluded={z['zoneId']:z for z in review['excludedHistoricalZones']}
for z in data['spectatorZones']:
    if z['zoneId'] in excluded and z!=excluded[z['zoneId']]:
        raise ValueError('Historical stand changed: review before applying seasonal exclusion')
data['spectatorZones']=[z for z in data['spectatorZones'] if z['zoneId'] not in excluded]
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
p=root/'src/circuits/generated/summaries.json';summaries=json.loads(p.read_text('utf8'))
summary=next(s for s in summaries if s['circuitId']=='melbourne')
if summary['spectatorZoneIds']!=data['spectatorZoneIds']:
    summary['spectatorZoneIds']=data['spectatorZoneIds'];p.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
