"""Add an explicitly approximate GA subset without changing its native stand/fence."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda path:json.loads(path.read_text('utf8'))
digest=lambda value:hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()
physical=lambda zone:{k:v for k,v in zone.items() if k!='geometryReview'}
def reviewed(data,record):
 if (data['circuitId'],data['season'])!=(record['circuitId'],record['season']):raise ValueError('Vale GA identity mismatch')
 if digest({k:data[k] for k in ['trackGeometry','corners','elevation']})!=record['geometryFingerprint']:raise ValueError('Revalidate Vale GA road/terrain')
 vale=read(ROOT/'src/circuits/europe/silverstone-vale-2026.json')
 if digest(vale['gaEvidence']['nativeGroundBoundary'])!=record['nativeGroundBoundaryFingerprint']:raise ValueError('Revalidate Vale native ground boundary')
 if not vale['sceneAcceptance'].get('accepted') or digest({'zone':vale['zone'],'barrierLayer':vale['barrierLayer']})!=record['valeSourceFingerprint']:raise ValueError('Revalidate Vale GA parent stand/barriers')
 actual=next((z for z in data['spectatorZones'] if z['zoneId']=='vale'),None)
 if actual is None or physical(actual)!=physical(vale['zone']):raise ValueError('Preserve independent native Vale edits')
 if actual.get('geometryReview',{}).get('issues'):raise ValueError('Unresolved native Vale geometry audit')
 if read(ROOT/'src/circuits/barriers/silverstone-vale.json')!=record['barrierLayer']:raise ValueError('Preserve independent Vale barrier edits')
 zone=record['zone'];acceptance=record['sceneAcceptance']
 if not acceptance.get('accepted') or record['footprintAudit']['issues'] or zone['availability']!='available' or zone['geometryReview']['issues']:raise ValueError('Vale GA scene/physical acceptance required')
 if acceptance['modelSha256']!=digest({'zone':zone,'barrierLayer':record['barrierLayer']}):raise ValueError('Accepted Vale GA model changed')
 if set(zone['requiredBarrierIds'])!={b['id'] for b in record['barrierLayer']['barriers']}:raise ValueError('Required Vale GA fence mismatch')
 return copy.deepcopy(zone)
def apply():
 record=read(ROOT/'src/circuits/europe/silverstone-vale-ga-2026.json');path=ROOT/'src/circuits/generated/silverstone.json';data=read(path);zone=reviewed(data,record)
 actual=next((z for z in data['spectatorZones'] if z['zoneId']==zone['zoneId']),None)
 if actual is not None and (physical(actual)!=physical(zone) or actual.get('geometryReview',{}).get('issues')):raise ValueError('Preserve independent GA edits or unresolved audit')
 data['spectatorZones']=[z for z in data['spectatorZones'] if z['zoneId']!=zone['zoneId']]+[zone];data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
 summary_path=ROOT/'src/circuits/generated/summaries.json';summaries=read(summary_path);next(s for s in summaries if s['circuitId']=='silverstone')['spectatorZoneIds']=data['spectatorZoneIds']
 for target,value in [(path,data),(summary_path,summaries)]:target.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('Vale GA stand-front subset applied; native stand/fence and remaining ticket geography preserved.')
if __name__=='__main__':apply()
