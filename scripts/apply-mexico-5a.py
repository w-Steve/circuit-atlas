"""Add the missing5A physical face without filling the aisle or changing neighbors."""
import copy,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def apply(data,review):
 assert data['circuitId']==review['circuitId']=='mexico' and data['season']==review['season']==2026
 out=copy.deepcopy(data)
 supplement=json.loads((ROOT/'src/circuits/americas/mexico-supplement-2026.json').read_text('utf8'))['zones']
 extra={z['zoneId']:z for z in supplement}
 for z in out['spectatorZones']:
  if z['zoneId'] in extra:assert z==extra[z['zoneId']],'Preserve independent supplement edits'
 neighbors=[(z['zoneId'],[s['boundary'] for s in z['surfaces']]) for z in out['spectatorZones'] if z['zoneId'] not in ['grada-5a','grada-6b'] and z['zoneId'] not in extra]
 assert hashlib.sha256(json.dumps(neighbors,sort_keys=True).encode()).hexdigest()==review['neighborFingerprint'],'Unexpected neighbor geometry'
 six=json.loads((ROOT/'src/circuits/americas/mexico-6b-2026.json').read_text('utf8'))
 assert next(z for z in out['spectatorZones'] if z['zoneId']=='grada-6b')['boundary'] in [six['oldBoundary'],six['zone']['boundary']],'Unexpected6B geometry'
 i=next(i for i,z in enumerate(out['spectatorZones']) if z['zoneId']=='grada-5a')
 rings=[s['boundary'] for s in out['spectatorZones'][i]['surfaces']]
 assert rings in [[s['boundary'] for s in review['oldZone']['surfaces']],[s['boundary'] for s in review['zone']['surfaces']]],'Unexpected5A faces'
 assert review['zone']['surfaces'][0]==review['oldZone']['surfaces'][0],'Preserve accepted north face'
 out['spectatorZones'][i]=copy.deepcopy(review['zone'])
 return out
if __name__=='__main__':
 p=ROOT/'src/circuits/generated/mexico.json'
 d=apply(json.loads(p.read_text('utf8')),json.loads((ROOT/'src/circuits/americas/mexico-5a-2026.json').read_text('utf8')))
 p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('5A north/south faces applied with independent selection boundaries.')
