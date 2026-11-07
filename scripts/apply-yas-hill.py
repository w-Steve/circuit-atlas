"""Publish the existing source-backed Hill approximation and its required fences."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def migrate(data,review):
 if data['circuitId']!=review['circuitId'] or data['season']!=review['season']:raise ValueError('Wrong Hill package')
 result=copy.deepcopy(data);zone=review['zone']
 current=next((z for z in result['spectatorZones'] if z['zoneId']==zone['zoneId']),None)
 if current is not None and current!=zone:raise ValueError('Preserve independent Hill edits')
 if current is None:result['spectatorZones'].append(copy.deepcopy(zone))
 result['spectatorZoneIds']=[z['zoneId'] for z in result['spectatorZones'] if z['availability']=='available']
 return result
if __name__=='__main__':
 review=json.loads((ROOT/'src/circuits/asia/yas-hill-2026.json').read_text('utf8'))
 barrier=ROOT/'src/circuits/barriers/yas-marina-hill.json'
 if barrier.exists() and json.loads(barrier.read_text('utf8'))!=review['barrierPackage']:raise ValueError('Preserve independent Hill fence edits')
 path=ROOT/'src/circuits/generated/yas-marina.json'
 result=migrate(json.loads(path.read_text('utf8')),review)
 barrier.write_text(json.dumps(review['barrierPackage'],ensure_ascii=False,indent=2)+'\n','utf8')
 path.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
