"""Migrate the source-backed Farm foreground and mandatory native fence context."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda path:json.loads(path.read_text('utf8'))
digest=lambda value:hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()
physical=lambda zone:{k:v for k,v in zone.items() if k!='geometryReview'}
def reviewed(data,record):
 if (data['circuitId'],data['season'])!=(record['circuitId'],record['season']):raise ValueError('Farm GA identity mismatch')
 if digest({k:data[k] for k in ['trackGeometry','corners','elevation']})!=record['geometryFingerprint']:raise ValueError('Revalidate Farm road/terrain')
 zone,stand,layer=record['zone'],record['stand'],record['barrierLayer'];acceptance=record['sceneAcceptance']
 if not acceptance.get('accepted') or record['footprintAudit']['issues']:raise ValueError('Farm scene/physical acceptance required')
 if acceptance['modelSha256']!=digest({'zone':zone,'stand':stand,'barrierLayer':layer}):raise ValueError('Accepted Farm model changed')
 if zone['availability']!='available' or zone['geometryReview']['issues'] or layer['availability']!='available':raise ValueError('Unaccepted Farm GA model')
 if set(zone['requiredBarrierIds'])!={b['id'] for b in layer['barriers']} or stand['requiredBarrierIds']!=zone['requiredBarrierIds']:raise ValueError('Farm native fences missing')
 return copy.deepcopy(zone),copy.deepcopy(stand),copy.deepcopy(layer)
def apply():
 record=read(ROOT/'src/circuits/europe/silverstone-farm-ga-2026.json');path=ROOT/'src/circuits/generated/silverstone.json';data=read(path);zone,stand,layer=reviewed(data,record)
 current=next(z for z in data['spectatorZones'] if z['zoneId']=='farm-curve')
 if physical(current) not in [physical(record['oldStand']),physical(stand)]:raise ValueError('Preserve independent Farm seating edits')
 if current.get('geometryReview',{}).get('issues'):raise ValueError('Unresolved Farm seating audit')
 actual=next((z for z in data['spectatorZones'] if z['zoneId']==zone['zoneId']),None)
 if actual is not None and (physical(actual)!=physical(zone) or actual.get('geometryReview',{}).get('issues')):raise ValueError('Preserve independent Farm GA edits/audit')
 layer_path=ROOT/'src/circuits/barriers/silverstone-farm.json';previous=copy.deepcopy(layer);previous['availability']='preparing'
 if layer_path.exists() and read(layer_path) not in [previous,layer]:raise ValueError('Preserve independent Farm fence edits')
 data['spectatorZones']=[stand if z['zoneId']=='farm-curve' else z for z in data['spectatorZones'] if z['zoneId']!=zone['zoneId']]+[zone];data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
 summary_path=ROOT/'src/circuits/generated/summaries.json';summaries=read(summary_path);next(s for s in summaries if s['circuitId']=='silverstone')['spectatorZoneIds']=data['spectatorZoneIds']
 for target,value,pretty in [(path,data,False),(summary_path,summaries,False),(layer_path,layer,True)]:target.write_text(json.dumps(value,ensure_ascii=False,indent=2 if pretty else None,separators=None if pretty else (',',':'))+'\n','utf8')
 print('Farm GA foreground applied with connected native fences; seating physics unchanged.')
if __name__=='__main__':apply()
