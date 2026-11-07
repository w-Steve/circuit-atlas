"""Preserve the user-approved approximate Turn1 bank during regeneration."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def migrate(data,review):
 if data['circuitId']!=review['circuitId'] or data['season']!=review['season']:raise ValueError('Wrong Turn1 package')
 current=next(z for z in data['spectatorZones'] if z['zoneId']==review['zoneId'])
 if current not in [review['beforeZone'],review['zone']]:raise ValueError('Preserve independent Turn1 edits')
 result=copy.deepcopy(data)
 result['spectatorZones']=[copy.deepcopy(review['zone']) if z['zoneId']==review['zoneId'] else z for z in result['spectatorZones']]
 result['spectatorZoneIds']=[z['zoneId'] for z in result['spectatorZones'] if z['availability']=='available']
 return result

if __name__=='__main__':
 path=ROOT/'src/circuits/generated/singapore.json'
 review=json.loads((ROOT/'src/circuits/asia/singapore-turn1-2026.json').read_text('utf8'))
 path.write_text(json.dumps(migrate(json.loads(path.read_text('utf8')),review),ensure_ascii=False,separators=(',',':'))+'\n','utf8')
