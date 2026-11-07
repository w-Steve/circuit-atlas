"""Guarded replacement of one accepted source zone in a registered circuit."""
import copy,hashlib,json,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads(p.read_text('utf8'))
name=next(a.split('=',1)[1] for a in sys.argv[1:] if a.startswith('--source='))
source=read(ROOT/name);cid=source['circuitId'];assert re.fullmatch('[a-z0-9-]+',cid)
summariesPath=ROOT/'src/circuits/generated/summaries.json';summaries=read(summariesPath);summary=next(s for s in summaries if s['circuitId']==cid)
path=ROOT/f'src/circuits/generated/{cid}.json';data=read(path)
assert source['season']==data['season']==2026 and data['circuitId']==cid
fingerprint=hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
assert fingerprint==source['geometryFingerprint'],'Road/terrain changed; regenerate and revalidate'
assert source.get('sceneAcceptance',{}).get('accepted'),'Scene acceptance required'
assert source['roadIntersectionMetres2']<1e-6 and not source['otherIntersections'],'Unresolved footprint conflicts'
zone=copy.deepcopy(source['zone']);assert zone['availability']=='available' and not zone['geometryReview']['issues']
assert zone['boundary']==source['sourceBoundary'] and all(s['boundary']==source['sourceBoundary'] for s in zone['surfaces']),'Preserve the full source boundary'
matches=[z for z in data['spectatorZones'] if z['zoneId']==zone['zoneId']];assert len(matches)==1,'A replacement requires exactly one existing identity'
old=matches[0];structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
assert structure(old) in [structure(source['oldZone']),structure(zone)],'Preserve independent edits'
data['spectatorZones'][data['spectatorZones'].index(old)]=zone
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available'];summary['spectatorZoneIds']=data['spectatorZoneIds']
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8');summariesPath.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
