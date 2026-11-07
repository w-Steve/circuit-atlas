import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def apply(data,review):
 assert data['circuitId']==review['circuitId']=='mexico' and data['season']==review['season']==2026
 result=copy.deepcopy(data)
 for zone in review['zones']:
  old=next((z for z in result['spectatorZones'] if z['zoneId']==zone['zoneId']),None)
  if old is not None and old!=zone:raise ValueError('Preserve independent '+zone['zoneId'])
  if old is None:result['spectatorZones'].append(copy.deepcopy(zone))
 result['spectatorZoneIds']=[z['zoneId'] for z in result['spectatorZones'] if z['availability']=='available']
 return result
if __name__=='__main__':
 p=ROOT/'src/circuits/generated/mexico.json'
 p.write_text(json.dumps(apply(json.loads(p.read_text('utf8')),json.loads((ROOT/'src/circuits/americas/mexico-supplement-2026.json').read_text('utf8'))),ensure_ascii=False,separators=(',',':'))+'\n','utf8')
