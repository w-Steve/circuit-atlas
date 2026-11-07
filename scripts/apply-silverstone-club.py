"""Migrate three erroneous prototypes into two source-backed public banks."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads(p.read_text('utf8'))
digest=lambda value:hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def reviewed(data,record):
 if data['circuitId']!=record['circuitId'] or data['season']!=record['season']:raise ValueError('Club season/identity mismatch')
 if digest({k:data[k] for k in ['trackGeometry','corners','elevation']})!=record['geometryFingerprint']:raise ValueError('Road/terrain changed; revalidate Club')
 if not record['sceneAcceptance'].get('accepted') or any(r['issues'] for r in record['footprintAudit']):raise ValueError('Club scene/footprint acceptance required')
 for zone in record['zones']:
  if zone['availability']!='available' or zone['geometryReview']['issues']:raise ValueError('Unaccepted Club zone')
 return copy.deepcopy(record['zones'])

def apply():
 record=read(ROOT/'src/circuits/europe/silverstone-club-2026.json');path=ROOT/'src/circuits/generated/silverstone.json';data=read(path)
 desired=reviewed(data,record);ids={z['zoneId'] for z in record['oldZones']+desired};current=[z for z in data['spectatorZones'] if z['zoneId'] in ids]
 normalized=lambda zones:sorted(zones,key=lambda z:z['zoneId'])
 if normalized(current) not in [normalized(record['oldZones']),normalized(desired)]:raise ValueError('Preserve independent Club physical/source edits')
 aliases=data.get('spectatorZoneAliases',{})
 if any(k in aliases and aliases[k]!=v for k,v in record['aliases'].items()):raise ValueError('Preserve independent route aliases')
 data['spectatorZones']=[z for z in data['spectatorZones'] if z['zoneId'] not in ids]+desired
 data['spectatorZoneAliases']={**aliases,**record['aliases']};data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
 summaries_path=ROOT/'src/circuits/generated/summaries.json';summaries=read(summaries_path);next(s for s in summaries if s['circuitId']=='silverstone')['spectatorZoneIds']=data['spectatorZoneIds']
 for p,value in [(path,data),(summaries_path,summaries)]:p.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('Club A and continuous Club Corner applied; obsolete B/C routes retained as aliases.')

if __name__=='__main__':apply()
