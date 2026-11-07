"""Apply primary-source product identities without altering metric geometry."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
review=json.loads((root/'src/circuits/europe/monza-ascari-identity.json').read_text('utf8'))
p=root/'src/circuits/generated/monza.json';data=json.loads(p.read_text('utf8'))
for change in review['changes']:
    zone=next(z for z in data['spectatorZones'] if z['zoneId']==change['zoneId'])
    if zone['surfaces']!=change['previousZone']['surfaces'] or zone['source']['url']!=change['previousZone']['source']['url']:raise ValueError('Footprint changed: recheck source identity before replaying')
    zone.update({'name':change['name'],'ticketCodes':change['ticketCodes'],'identitySource':change['identitySource']})
p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
