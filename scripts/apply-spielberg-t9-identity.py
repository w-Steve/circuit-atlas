"""Correct a ticket identity; retain all physical parameters and legacy links."""
import json,hashlib,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
digest=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def reviewed(data,r):
 if data['circuitId']!='spielberg' or data['season']!=2026 or digest(r['zone'])!=r['zoneSha256']:raise ValueError('Invalid T9 identity model')
 if digest({k:data[k] for k in ['trackGeometry','corners','elevation']})!=r['geometryFingerprint']:raise ValueError('Revalidate T9 geometry')
 return copy.deepcopy(r['zone'])
def apply():
 r=read('src/circuits/europe/spielberg-t9-identity-2026.json');d=read('src/circuits/generated/spielberg.json');z=reviewed(d,r);ids={'ost-t8','t9'};current=[q for q in d['spectatorZones'] if q['zoneId'] in ids]
 if len(current)!=1 or current[0] not in [r['oldZone'],z]:raise ValueError('Preserve independent T8/T9 edits')
 if digest([q for q in d['spectatorZones'] if q['zoneId'] not in ids])!=r['neighborFingerprint']:raise ValueError('Revalidate T9 neighbors')
 aliases=d.get('spectatorZoneAliases',{})
 if 'ost-t8' in aliases and aliases['ost-t8']!='t9':raise ValueError('Preserve independent region alias')
 d['spectatorZones']=[z if q['zoneId'] in ids else q for q in d['spectatorZones']];d['spectatorZoneAliases']={**aliases,**r['aliases']};d['spectatorZoneIds']=[q['zoneId'] for q in d['spectatorZones'] if q['availability']=='available']
 summaries=read('src/circuits/generated/summaries.json');next(s for s in summaries if s['circuitId']=='spielberg')['spectatorZoneIds']=d['spectatorZoneIds']
 for p,value in [('src/circuits/generated/spielberg.json',d),('src/circuits/generated/summaries.json',summaries)]: (ROOT/p).write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('East bank corrected from Ost/T8 to T9; physical geometry retained, old zone link aliased.')
if __name__=='__main__':apply()
