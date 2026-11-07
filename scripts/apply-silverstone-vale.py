"""Replace only the known manual Vale prototype; retain independent edits."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda path:json.loads(path.read_text('utf8'))
digest=lambda value:hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()
physical=lambda zone:{k:v for k,v in zone.items() if k!='geometryReview'}
def reviewed(data,record):
 if (data['circuitId'],data['season'])!=(record['circuitId'],record['season']):raise ValueError('Vale identity mismatch')
 if digest({k:data[k] for k in ['trackGeometry','corners','elevation']})!=record['geometryFingerprint']:raise ValueError('Revalidate Vale road/terrain')
 zone=record['zone'];layer=record['barrierLayer'];acceptance=record['sceneAcceptance']
 if not acceptance.get('accepted') or record['footprintAudit']['issues']:raise ValueError('Vale scene/physical acceptance required')
 if acceptance['modelSha256']!=digest({'zone':zone,'barrierLayer':layer}):raise ValueError('Accepted Vale source changed')
 if zone['availability']!='available' or zone['geometryReview']['issues'] or layer['availability']!='available':raise ValueError('Unaccepted Vale model')
 if set(zone['requiredBarrierIds'])!={b['id'] for b in layer['barriers']}:raise ValueError('Missing Vale barrier geometry')
 return copy.deepcopy(zone),copy.deepcopy(layer)
def apply():
 record=read(ROOT/'src/circuits/europe/silverstone-vale-2026.json');path=ROOT/'src/circuits/generated/silverstone.json';data=read(path)
 zone,layer=reviewed(data,record);old=next(z for z in data['spectatorZones'] if z['zoneId']=='vale')
 if physical(old) not in [physical(record['oldZone']),physical(zone)]:raise ValueError('Preserve independent Vale edits')
 layer_path=ROOT/'src/circuits/barriers/silverstone-vale.json';prior=copy.deepcopy(layer);prior['availability']='preparing'
 if layer_path.exists() and read(layer_path) not in [prior,layer]:raise ValueError('Preserve independent Vale barrier edits')
 data['spectatorZones']=[zone if z['zoneId']=='vale' else z for z in data['spectatorZones']]
 for target,value,pretty in [(path,data,False),(layer_path,layer,True)]:target.write_text(json.dumps(value,ensure_ascii=False,indent=2 if pretty else None,separators=None if pretty else (',',':'))+'\n','utf8')
 print('Native Vale plan restored with mandatory trackside fence; GA admission not expanded.')
if __name__=='__main__':apply()
