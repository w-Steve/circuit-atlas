"""Guarded bank migration; each available group member needs scene acceptance."""
import copy,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sourcePath=next((a.split('=',1)[1] for a in sys.argv[1:] if a.startswith('--source=')),'src/circuits/europe/madrid-ga1-2026.json')
source=json.loads((ROOT/sourcePath).read_text('utf8'))
path=ROOT/'src/circuits/generated/madrid.json';data=json.loads(path.read_text('utf8'))
fingerprint=hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
assert fingerprint==source['geometryFingerprint'],'Rebuild for changed road/terrain'
def structure(z):return {k:v for k,v in z.items() if k not in ['availability','geometryReview']}
preview='--preview' in sys.argv
previewZones={a.split('=',1)[1] for a in sys.argv[1:] if a.startswith('--preview-zone=')}
entries=source.get('banks',[source])
closed='--closed' in sys.argv
assert not closed or not preview and not previewZones and all(e['zone']['availability']!='available' for e in entries),'Closed migration cannot open a preview or available bank'
assert previewZones <= {e['zone']['zoneId'] for e in entries},'Unknown preview bank'
assert preview or previewZones or 'banks' in source or source.get('sceneAcceptance',{}).get('accepted') or closed,'Explicit preview, accepted scene, or closed migration required'
for entry in entries:
 zone=copy.deepcopy(entry['zone']);old=next((z for z in data['spectatorZones'] if z['zoneId']==zone['zoneId']),None)
 assert old==entry['oldZone'] or old is not None and structure(old)==structure(zone),'Preserve independently edited bank'
 if preview or zone['zoneId'] in previewZones:zone['availability']='available';zone['geometryReview']['issues']=[]
 elif zone['availability']=='available':assert entry.get('sceneAcceptance',{}).get('accepted'),'Available bank requires its own acceptance'
 if old is None:data['spectatorZones'].append(zone)
 else:data['spectatorZones'][data['spectatorZones'].index(old)]=zone
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
path=ROOT/'src/circuits/generated/summaries.json';summaries=json.loads(path.read_text('utf8'))
next(s for s in summaries if s['circuitId']=='madrid')['spectatorZoneIds']=data['spectatorZoneIds']
path.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
