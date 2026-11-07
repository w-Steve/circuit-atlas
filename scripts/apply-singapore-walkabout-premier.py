"""Append configured standing platforms without duplicate zones or lost edits."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def migrate(data,review):
 if data['circuitId']!=review['circuitId'] or data['season']!=review['season']:raise ValueError('Wrong platform package')
 result=copy.deepcopy(data)
 for zone in review['zones']:
  current=next((z for z in result['spectatorZones'] if z['zoneId']==zone['zoneId']),None)
  if current is not None and current!=zone:raise ValueError('Preserve independent platform edits')
  if current is None:result['spectatorZones'].append(copy.deepcopy(zone))
 result['spectatorZoneIds']=[z['zoneId'] for z in result['spectatorZones'] if z['availability']=='available']
 return result
if __name__=='__main__':
 path=ROOT/'src/circuits/generated/singapore.json'
 review=json.loads((ROOT/'src/circuits/asia/singapore-walkabout-premier-2026.json').read_text('utf8'))
 path.write_text(json.dumps(migrate(json.loads(path.read_text('utf8')),review),ensure_ascii=False,separators=(',',':'))+'\n','utf8')
