"""Guarded migration of the reviewed, explicitly approximate Gold7 structure."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads(p.read_text('utf8'))
digest=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def reviewed(data,record,area="Gold7"):
 if (data['circuitId'],data['season'])!=('spa',2026):raise ValueError(f'{area} circuit identity mismatch')
 if digest({k:data[k] for k in ['trackGeometry','corners','elevation']})!=record['geometryFingerprint']:raise ValueError(f'Revalidate {area} road/terrain')
 zone,layer=record['zone'],record['barrierLayer']
 if not record['identityAccepted'] or not record['sceneAcceptance']['accepted'] or record['sceneAcceptance']['modelSha256']!=digest({'zone':zone,'barrierLayer':layer}):raise ValueError(f'Unaccepted {area} model')
 if zone['availability']!='available' or zone['geometryReview']['issues'] or layer['availability']!='available' or bool(zone['surfaces'][0].get('canopy'))!=record.get('covered',True):raise ValueError(f'Missing {area} scene structure')
 if set(zone['requiredBarrierIds'])!={b['id'] for b in layer['barriers']}:raise ValueError(f'Missing {area} native barriers')
 return copy.deepcopy(zone),copy.deepcopy(layer)
def apply(record_name="spa-gold7-2026.json",area="Gold7"):
 record=read(ROOT/'src/circuits/europe'/record_name);path=ROOT/'src/circuits/generated/spa.json';data=read(path);zone,layer=reviewed(data,record,area)
 current=next((z for z in data['spectatorZones'] if z['zoneId']==zone['zoneId']),None)
 if current not in [record['oldZone'],zone]:raise ValueError(f'Preserve independent {area} edits')
 ter=read(ROOT/'src/circuits/europe/spa-ter-2026.json')['zone']
 for z in data['spectatorZones']:
  if z['zoneId']==ter['zoneId'] and z!=ter:raise ValueError('Preserve independent Ter edits')
 others=[z for z in data['spectatorZones'] if z['zoneId'] not in [zone['zoneId'],ter['zoneId']]]
 repairs=read(ROOT/'src/circuits/europe/spa-repairs-2026.json')
 replacements={z['zoneId']:z for z in repairs['zones']};legacy={z['zoneId']:z for z in repairs['beforeZones']}
 for z in others:
  if z['zoneId'] in replacements and z not in [legacy[z['zoneId']],replacements[z['zoneId']]]:raise ValueError('Preserve independent repaired bank edits')
 others=[legacy[z['zoneId']] if z['zoneId'] in replacements and z==replacements[z['zoneId']] else z for z in others]
 if digest(others)!=record['neighborFingerprint']:raise ValueError(f'Revalidate {area} neighbors')
 if digest(read(ROOT/'src/circuits/facilities/spa.json'))!=record['facilitiesFingerprint']:raise ValueError(f'Revalidate {area} facilities')
 barrier_path=ROOT/'src/circuits/barriers/spa-gold7.json'
 if barrier_path.exists() and read(barrier_path)!=layer:raise ValueError(f'Preserve independent {area} barrier edits')
 data['spectatorZones']=[zone if z['zoneId']==zone['zoneId'] else z for z in data['spectatorZones']];
 if current is None:data['spectatorZones'].append(zone)
 data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
 summary_path=ROOT/'src/circuits/generated/summaries.json';summaries=read(summary_path);next(s for s in summaries if s['circuitId']=='spa')['spectatorZoneIds']=data['spectatorZoneIds']
 for target,value,pretty in [(path,data,False),(summary_path,summaries,False),(barrier_path,layer,True)]:target.write_text(json.dumps(value,ensure_ascii=False,indent=2 if pretty else None,separators=None if pretty else (',',':'))+'\n','utf8')
 print(f'{area} approximate native footprint, roof/posts and four mandatory barriers applied; other regions preserved.')
if __name__=='__main__':apply()
