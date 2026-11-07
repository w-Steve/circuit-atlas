"""Replay factual public mound candidates; --preview is local review only."""
import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'src/circuits/asia/melbourne-ground.json').read_text('utf8'))
p=root/'src/circuits/generated/melbourne.json';data=json.loads(p.read_text('utf8'))
ids={z['zoneId'] for z in config['zones']}
zones=config['zones']
if '--preview' in sys.argv:
    for z in zones:z['availability']='available'
data['spectatorZones']=[z for z in data['spectatorZones'] if z['zoneId'] not in ids]+zones
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
if not any(s['url']==config['archiveUrl'] for s in data['dataSources']):
    data['dataSources'].append(dict(url=config['archiveUrl'],checkedAt='2026-10-25',method='extracted',confidence='low',notes='Official2026 viewing-mound outline facts recovered from a verified March4 archive. Schematic registration and existing DEM do not certify built mound heights or full Park Pass access. No map artwork distributed.'))
p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
p=root/'src/circuits/generated/summaries.json';summaries=json.loads(p.read_text('utf8'))
summary=next(s for s in summaries if s['circuitId']=='melbourne')
if summary['spectatorZoneIds']!=data['spectatorZoneIds']:
    summary['spectatorZoneIds']=data['spectatorZoneIds'];p.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
