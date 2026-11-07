"""Replace the legacy whole-building slope with configured approximate ordinary banks."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def migrate(data,review):
 if data['circuitId']!=review['circuitId'] or data['season']!=review['season']:raise ValueError('Wrong Main package')
 current=next(z for z in data['spectatorZones'] if z['zoneId']=='main')
 if current not in [*review['acceptedBeforeZones'],review['zone']]:raise ValueError('Preserve independent Main edits')
 result=copy.deepcopy(data)
 result['spectatorZones']=[copy.deepcopy(review['zone']) if z['zoneId']=='main' else z for z in result['spectatorZones']]
 result['spectatorZoneIds']=[z['zoneId'] for z in result['spectatorZones'] if z['availability']=='available']
 return result

if __name__=='__main__':
 path=ROOT/'src/circuits/generated/yas-marina.json'
 review=json.loads((ROOT/'src/circuits/asia/yas-main-2026.json').read_text('utf8'))
 path.write_text(json.dumps(migrate(json.loads(path.read_text('utf8')),review),ensure_ascii=False,separators=(',',':'))+'\n','utf8')
