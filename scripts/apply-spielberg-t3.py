"""Replay one reviewed T3 footprint without overwriting independent edits."""
import json,hashlib,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
digest=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def reviewed(data,record):
 if data['circuitId']!='spielberg' or data['season']!=2026 or not record['sceneAcceptance']['accepted']:raise ValueError('Unaccepted T3 model')
 if digest(record['zone'])!=record['sceneAcceptance']['modelSha256']:raise ValueError('T3 accepted model changed')
 if digest({k:data[k] for k in ['trackGeometry','corners','elevation']})!=record['geometryFingerprint']:raise ValueError('Revalidate T3 road/terrain')
 return copy.deepcopy(record['zone'])
def apply():
 r=read('src/circuits/europe/spielberg-t3-2026.json');d=read('src/circuits/generated/spielberg.json');zone=reviewed(d,r);current=next(z for z in d['spectatorZones'] if z['zoneId']=='t3')
 if current not in [r['oldZone'],zone]:raise ValueError('Preserve independent T3 edits')
 if digest([z for z in d['spectatorZones'] if z['zoneId']!='t3'])!=r['neighborFingerprint']:raise ValueError('Revalidate T3 neighbors')
 d['spectatorZones']=[zone if z['zoneId']=='t3' else z for z in d['spectatorZones']];d['spectatorZoneIds']=[z['zoneId'] for z in d['spectatorZones'] if z['availability']=='available']
 summaries=read('src/circuits/generated/summaries.json');next(s for s in summaries if s['circuitId']=='spielberg')['spectatorZoneIds']=d['spectatorZoneIds']
 for path,value in [('src/circuits/generated/spielberg.json',d),('src/circuits/generated/summaries.json',summaries)]: (ROOT/path).write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('T3 native-plan approximation applied; other regions and physics retained.')
if __name__=='__main__':apply()
