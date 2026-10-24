"""Reapply individually source-matched extra areas before geometry screening.
No OSM tag alone enables a stand; all supplemental areas initially stay withheld.
"""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'src/circuits/asia/suzuka-supplemental-zones.json'
config=json.loads(source.read_text(encoding='utf-8'))
path=root/'src/circuits/generated/suzuka.json';data=json.loads(path.read_text(encoding='utf-8'))
for area in config['areas']:
    old=next((z for z in data['spectatorZones'] if z['zoneId']==area['zoneId']),None)
    if old:
        if old['boundary']!=area['boundary']:raise ValueError('Supplement changed; review source before replacing an existing footprint')
        continue
    data['spectatorZones'].append(area)
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
