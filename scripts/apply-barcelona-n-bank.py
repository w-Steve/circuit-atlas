"""Replay a source-backed partial grass bank, preserving independent edits."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
digest=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def reviewed_zones(data,record):
 if data['circuitId']!='barcelona' or data['season']!=2026 or not record['sceneAcceptance']['accepted']:raise ValueError('Unaccepted bank')
 if digest(record['zones'])!=record['sceneAcceptance']['modelSha256'] or digest(record['barrierPackage'])!=record['sceneAcceptance']['barrierSha256']:raise ValueError('Accepted bank or fence changed')
 if digest({k:data[k] for k in ['trackGeometry','corners','elevation']})!=record['geometryFingerprint']:raise ValueError('Revalidate bank road/ground')
 return copy.deepcopy(record['zones'])

def migrate(data,record):
 d=copy.deepcopy(data);zones=reviewed_zones(d,record);ids={z['zoneId'] for z in zones}
 current=[z for z in d['spectatorZones'] if z['zoneId'] in ids]
 if current not in [[],zones]:raise ValueError('Preserve independent bank edits or duplicate identity')
 extra={z['zoneId']:z for z in json.loads((ROOT/'src/circuits/europe/barcelona-supplement-2026.json').read_text('utf8'))['zones']}
 for z in d['spectatorZones']:
  if z['zoneId'] in extra and z!=extra[z['zoneId']]:raise ValueError('Preserve independent I/V edits')
 if digest([z for z in d['spectatorZones'] if z['zoneId'] not in ids and z['zoneId'] not in extra])!=record['neighborFingerprint']:raise ValueError('Revalidate neighboring regions')
 d['spectatorZones']=[z for z in d['spectatorZones'] if z['zoneId'] not in ids]+zones
 d['spectatorZoneIds']=[z['zoneId'] for z in d['spectatorZones'] if z['availability']=='available']
 return d

if __name__=='__main__':
 read=lambda p:json.loads((ROOT/p).read_text('utf8'))
 r=read('src/circuits/europe/barcelona-n-bank-2026.json');d=migrate(read('src/circuits/generated/barcelona.json'),r)
 barrier=ROOT/'src/circuits/barriers/barcelona-n-bank.json'
 if barrier.exists() and json.loads(barrier.read_text('utf8'))!=r['barrierPackage']:raise ValueError('Preserve independent fence edits')
 summaries=read('src/circuits/generated/summaries.json');next(s for s in summaries if s['circuitId']=='barcelona')['spectatorZoneIds']=d['spectatorZoneIds']
 for p,value in [('src/circuits/generated/barcelona.json',d),('src/circuits/generated/summaries.json',summaries),('src/circuits/barriers/barcelona-n-bank.json',r['barrierPackage'])]:
  (ROOT/p).write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('Applied partial N-adjacent grass bank and complete native fence; other grass families remain incomplete.')
