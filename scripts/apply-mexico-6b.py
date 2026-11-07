"""Restore Mexico6B only from its independently associated outside native footprint."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def apply(data,review):
 assert data['circuitId']==review['circuitId']=='mexico' and data['season']==review['season']==2026
 out=copy.deepcopy(data)
 supplement=json.loads((ROOT/'src/circuits/americas/mexico-supplement-2026.json').read_text('utf8'))['zones']
 extra={z['zoneId']:z for z in supplement}
 for z in out['spectatorZones']:
  if z['zoneId'] in extra:assert z==extra[z['zoneId']],'Preserve independent supplement edits'
 neighbors=[(z['zoneId'],[s['boundary'] for s in z['surfaces']]) for z in out['spectatorZones'] if z['zoneId']!='grada-6b' and z['zoneId'] not in extra]
 assert hashlib.sha256(json.dumps(neighbors,sort_keys=True).encode()).hexdigest()==review['neighborFingerprint'],'Unexpected neighboring geometry'
 index=next(i for i,z in enumerate(out['spectatorZones']) if z['zoneId']=='grada-6b')
 assert out['spectatorZones'][index]['boundary'] in [review['oldBoundary'],review['zone']['boundary']],'Unexpected6B boundary'
 assert review['nativeSnapshot']['coordinates']==review['zone']['boundary'],'Do not crop or relocate native footprint'
 out['spectatorZones'][index]=copy.deepcopy(review['zone'])
 out['spectatorZoneIds']=[z['zoneId'] for z in out['spectatorZones'] if z['availability']=='available']
 return out
if __name__=='__main__':
 p=ROOT/'src/circuits/generated/mexico.json'
 d=apply(json.loads(p.read_text('utf8')),json.loads((ROOT/'src/circuits/americas/mexico-6b-2026.json').read_text('utf8')))
 p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 p=ROOT/'src/circuits/generated/summaries.json';rows=json.loads(p.read_text('utf8'))
 next(r for r in rows if r['circuitId']=='mexico')['spectatorZoneIds']=d['spectatorZoneIds']
 p.write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('Mexico6B restored; other region boundaries unchanged.')
