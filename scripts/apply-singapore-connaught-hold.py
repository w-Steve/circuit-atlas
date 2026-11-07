"""Migrate wrong-side Connaught geometry to the user-approved approximate bank."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def migrate(data,review):
 if data['circuitId']!=review['circuitId'] or data['season']!=review['season']:raise ValueError('Wrong Connaught package')
 current=next(z for z in data['spectatorZones'] if z['zoneId']==review['zoneId'])
 target=review.get('approximateZone',review['withheldZone'])
 if current not in [review['beforeZone'],review['withheldZone'],target]:raise ValueError('Preserve independent Connaught correction for review')
 result=copy.deepcopy(data)
 result['spectatorZones']=[copy.deepcopy(target) if z['zoneId']==review['zoneId'] else z for z in result['spectatorZones']]
 result['spectatorZoneIds']=[z['zoneId'] for z in result['spectatorZones'] if z['availability']=='available']
 return result

if __name__=='__main__':
 path=ROOT/'src/circuits/generated/singapore.json'
 review=json.loads((ROOT/'src/circuits/season-review/singapore-connaught-source-review-2026.json').read_text('utf8'))
 data=migrate(json.loads(path.read_text('utf8')),review)
 path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('Connaught reviewed approximation applied; independent edits preserved.')
