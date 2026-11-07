"""Replay accepted independent T2/T3 approximations; protect unrelated edits."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
digest=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def reviewed_zones(data,record):
 if data['circuitId']!='lusail' or data['season']!=2026 or not record['sceneAcceptance']['accepted']:raise ValueError('Unaccepted Lusail seating')
 if digest(record['zones'])!=record['sceneAcceptance']['modelSha256']:raise ValueError('Accepted seating payload changed')
 if digest({k:data[k] for k in ['trackGeometry','corners','elevation']})!=record['geometryFingerprint']:raise ValueError('Revalidate road and terrain')
 return copy.deepcopy(record['zones'])

def migrate(data,record):
 result=copy.deepcopy(data);zones=reviewed_zones(result,record);ids={z['zoneId'] for z in zones}
 current=[z for z in result['spectatorZones'] if z['zoneId'] in ids]
 if current not in [record['oldZones'],zones]:raise ValueError('Preserve independent edits or duplicate regions')
 if digest([z for z in result['spectatorZones'] if z['zoneId'] not in ids])!=record['neighborFingerprint']:raise ValueError('Revalidate neighboring regions')
 retained=[z for z in result['spectatorZones'] if z['zoneId'] not in ids]
 result['spectatorZones']=retained+zones
 result['spectatorZoneIds']=[z['zoneId'] for z in result['spectatorZones'] if z['availability']=='available']
 return result

def apply():
 r=read('src/circuits/asia/lusail-t2-t3-2026.json');d=migrate(read('src/circuits/generated/lusail.json'),r)
 summaries=read('src/circuits/generated/summaries.json');next(s for s in summaries if s['circuitId']=='lusail')['spectatorZoneIds']=d['spectatorZoneIds']
 for path,value in [('src/circuits/generated/lusail.json',d),('src/circuits/generated/summaries.json',summaries)]:
  (ROOT/path).write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('Applied independent Lusail T2/T3 seating; other regions retained.')
if __name__=='__main__':apply()
