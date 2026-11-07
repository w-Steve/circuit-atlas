"""Metadata-only correction: a visible map band is not complete T layer coverage."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sourcePath=ROOT/'src/circuits/europe/monaco-t-2026.json';dataPath=ROOT/'src/circuits/generated/monaco.json'
source=json.loads(sourcePath.read_text('utf8'));data=json.loads(dataPath.read_text('utf8'))
assert source['circuitId']==data['circuitId']=='monaco' and source['season']==data['season']==2026
assert source.get('sceneAcceptance',{}).get('accepted') and source['zone']['availability']=='available'
fingerprint=hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
assert source['geometryFingerprint']==fingerprint
current=next(z for z in data['spectatorZones'] if z['zoneId']=='t-rascasse');assert current==source['zone'],'Preserve independently edited runtime/source'
before=copy.deepcopy(current);note='当前为图示前侧观众区；单票不代表可跨分区通行。'
current['admissionNote']=note;source['zone']['admissionNote']=note
assert {k:v for k,v in before.items() if k!='admissionNote'}=={k:v for k,v in current.items() if k!='admissionNote'}
source['coverageScope']={'modeled':'Visible ordinary front band of the2D public map','completeOrdinaryCoverage':False,'requiredReview':'src/circuits/season-review/monaco-annual-ticket-source-review.json'}
source['sceneAcceptance']['checks'][0]='Full visible ordinary source-map band retained, with explicit VIP plan band excluded; complete ordinary seating layers are not certified.'
limitation=' Scope is the visible front band only; full covered/high ordinary-layer extent under or around overhead VIP remains unverified and required.'
if limitation not in source['sceneAcceptance']['limits']:source['sceneAcceptance']['limits']+=limitation
# Match the source builder's stable field order after this one-off migration.
acceptance=source.pop('sceneAcceptance');source['sceneAcceptance']=acceptance
for path,value in [(sourcePath,source),(dataPath,data)]:path.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+('\n' if path==sourcePath else ''),'utf8')
print('Only T admission scope and source coverage metadata updated; accepted front geometry/eyes/availability retained')
