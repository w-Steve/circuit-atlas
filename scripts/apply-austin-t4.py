"""Restore the named source footprint, preserving independent region changes."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
digest=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def migrate(data,review):
 if data['circuitId']!=review['circuitId'] or data['season']!=review['season']:raise ValueError('Wrong T4 package')
 current=next(z for z in data['spectatorZones'] if z['zoneId']=='turn-4')
 if current not in [review['oldZone'],review.get('preCanopyZone'),review['zone']]:raise ValueError('Preserve independent T4 edits')
 if digest([z for z in data['spectatorZones'] if z['zoneId']!='turn-4'])!=review['neighborFingerprint']:raise ValueError('Revalidate T4 neighbors')
 result=copy.deepcopy(data)
 result['spectatorZones']=[copy.deepcopy(review['zone']) if z['zoneId']=='turn-4' else z for z in result['spectatorZones']]
 result['spectatorZoneIds']=[z['zoneId'] for z in result['spectatorZones'] if z['availability']=='available']
 return result
if __name__=='__main__':
 path=ROOT/'src/circuits/generated/austin.json';review=json.loads((ROOT/'src/circuits/americas/austin-t4-2026.json').read_text('utf8'))
 data=migrate(json.loads(path.read_text('utf8')),review)
 path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 p=ROOT/'src/circuits/generated/summaries.json';summaries=json.loads(p.read_text('utf8'))
 next(s for s in summaries if s['circuitId']=='austin')['spectatorZoneIds']=data['spectatorZoneIds']
 p.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('T4 source plan restored; upper-canopy/vertical accuracy limits remain explicit.')
