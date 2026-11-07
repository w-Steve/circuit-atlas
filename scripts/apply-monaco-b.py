"""Guarded Monaco sourced-stand migration; explicit preview is not public acceptance."""
import copy,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads(p.read_text('utf8'))
sourcePath=next((a.split('=',1)[1] for a in sys.argv[1:] if a.startswith('--source=')),'src/circuits/europe/monaco-b-2026.json')
source=read(ROOT/sourcePath)
path=ROOT/'src/circuits/generated/monaco.json';data=read(path)
assert source['circuitId']==data['circuitId']=='monaco' and source['season']==data['season']==2026,'Stand circuit/season mismatch'
fingerprint=hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
assert fingerprint==source['geometryFingerprint'],'Road or terrain changed; rebuild the sourced stand'
preview='--preview' in sys.argv
assert preview or source.get('sceneAcceptance',{}).get('accepted'),'Explicit preview or accepted Monaco stand scene required'
zone=copy.deepcopy(source['zone']);old=next(z for z in data['spectatorZones'] if z['zoneId']==zone['zoneId'])
structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
assert structure(old) in [structure(source['oldZone']),structure(zone)],'Preserve independently edited Monaco stand'
if preview:zone['availability']='available';zone['geometryReview']['issues']=[]
assert zone['availability']=='available'
data['spectatorZones'][data['spectatorZones'].index(old)]=zone
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
path=ROOT/'src/circuits/generated/summaries.json';summaries=read(path)
next(s for s in summaries if s['circuitId']=='monaco')['spectatorZoneIds']=data['spectatorZoneIds']
path.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
