"""Add the independently configured approximate Republic bank without duplicates."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def migrate(data,review):
 if data['circuitId']!=review['circuitId'] or data['season']!=review['season']:raise ValueError('Wrong Republic package')
 current=next((z for z in data['spectatorZones'] if z['zoneId']==review['zoneId']),None)
 if current is not None and current!=review['zone']:raise ValueError('Preserve independent Republic edits')
 result=copy.deepcopy(data)
 if current is None:result['spectatorZones'].append(copy.deepcopy(review['zone']))
 result['spectatorZoneIds']=[z['zoneId'] for z in result['spectatorZones'] if z['availability']=='available']
 return result
if __name__=='__main__':
 path=ROOT/'src/circuits/generated/singapore.json'
 review=json.loads((ROOT/'src/circuits/asia/singapore-republic-2026.json').read_text('utf8'))
 path.write_text(json.dumps(migrate(json.loads(path.read_text('utf8')),review),ensure_ascii=False,separators=(',',':'))+'\n','utf8')
