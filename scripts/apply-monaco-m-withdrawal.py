import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def apply(data,review):
 assert data['circuitId']==review['circuitId']=='monaco' and data['season']==review['season']==2026
 result=copy.deepcopy(data)
 for entry in review['withdrawn']:
  old=next((z for z in result['spectatorZones'] if z['zoneId']==entry['zoneId']),None)
  if old is not None and old!=entry['zone']:raise ValueError('Preserve independent M candidate edit')
  result['spectatorZones']=[z for z in result['spectatorZones'] if z['zoneId']!=entry['zoneId']]
 result['spectatorZoneIds']=[z['zoneId'] for z in result['spectatorZones'] if z['availability']=='available']
 return result
if __name__=='__main__':
 p=ROOT/'src/circuits/generated/monaco.json'
 d=apply(json.loads(p.read_text('utf8')),json.loads((ROOT/'src/circuits/season-review/monaco-withdrawn-public-models.json').read_text('utf8')))
 p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
