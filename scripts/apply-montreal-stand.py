"""Guarded migration of a scene-accepted Montreal source envelope."""
import copy,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads(p.read_text('utf8'))
name=next((a.split('=',1)[1] for a in sys.argv[1:] if a.startswith('--source=')),'src/circuits/americas/montreal-16-2026.json')
source=read(ROOT/name);path=ROOT/'src/circuits/generated/montreal.json';data=read(path)
assert source['circuitId']==data['circuitId']=='montreal' and source['season']==data['season']==2026
fingerprint=hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
assert fingerprint==source['geometryFingerprint'],'Road/terrain changed; rebuild and revalidate the source'
assert not source.get('profileReview',{}).get('unresolved',False),'Resolve the known section-profile conflict before scene acceptance'
assert not source.get('blockingReview',{}).get('unresolved',False),'Resolve conflicts with independently sourced boundaries before scene acceptance'
if source.get('profileReview'):
    assert source['profileReview'].get('metricModelValidated') and all(s.get('rowPitch') for s in source['zone']['surfaces']),'Do not clear profile flags on the rejected uniform prototype'
assert source.get('sceneAcceptance',{}).get('accepted'),'Only scene-accepted sourced stands may migrate'
zone=copy.deepcopy(source['zone']);assert zone['availability']=='available'
matches=[z for z in data['spectatorZones'] if z['zoneId']==zone['zoneId']]
assert len(matches)<=1,'Duplicate runtime zone identity'
old=matches[0] if matches else None
structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
if source.get('addition'):
    assert source['oldZone'] is None and zone['boundary']==source['sourceBoundary'],'An addition must retain its independent source boundary'
    assert old is None or structure(old)==structure(zone),'Preserve independently edited added stand data'
    if old is None:data['spectatorZones'].append(zone)
    else:data['spectatorZones'][data['spectatorZones'].index(old)]=zone
else:
    assert old is not None and source['oldZone'] is not None,'A replacement cannot silently add a missing product'
    assert structure(old) in [structure(source['oldZone']),structure(zone)],'Preserve independently edited stand data'
    data['spectatorZones'][data['spectatorZones'].index(old)]=zone
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
path=ROOT/'src/circuits/generated/summaries.json';summaries=read(path);next(s for s in summaries if s['circuitId']=='montreal')['spectatorZoneIds']=data['spectatorZoneIds'];path.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
