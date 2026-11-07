import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def apply(data,review):
 assert data['circuitId']==review['circuitId']=='spa' and data['season']==review['season']==2026
 result=copy.deepcopy(data)
 for original in review['zones']:
  zone=original
  final_path=ROOT/'src/circuits/europe/spa-annual-supplement-2026.json'
  if final_path.exists():
   final=json.loads(final_path.read_text('utf8'))
   revised=next((z for z in final['zones'] if z['zoneId']==original['zoneId']),None)
   if revised and original in final['beforeZones']:zone=revised
  old=next((z for z in result['spectatorZones'] if z['zoneId']==zone['zoneId']),None)
  if old is not None and old!=zone and old!=original and old not in review['beforeZones']:raise ValueError('Preserve independent '+zone['zoneId'])
  if old is None:result['spectatorZones'].append(copy.deepcopy(zone))
  else:result['spectatorZones']=[copy.deepcopy(zone) if z['zoneId']==zone['zoneId'] else z for z in result['spectatorZones']]
 result['spectatorZoneIds']=[z['zoneId'] for z in result['spectatorZones'] if z['availability']=='available']
 return result
if __name__=='__main__':
 p=ROOT/'src/circuits/generated/spa.json'
 result=apply(json.loads(p.read_text('utf8')),json.loads((ROOT/'src/circuits/europe/spa-bronze-2026.json').read_text('utf8')))
 p.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 summaryPath=ROOT/'src/circuits/generated/summaries.json'
 summaries=json.loads(summaryPath.read_text('utf8'))
 next(v for v in summaries if v['circuitId']=='spa')['spectatorZoneIds']=result['spectatorZoneIds']
 summaryPath.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
