"""Explicit offline candidate preview; restores exact source and baseline build in finally. Run only with the local4173 preview server available."""
import json,os,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];os.chdir(ROOT)
path=Path('src/circuits/generated/madrid.json');original=path.read_bytes();candidate=json.loads(Path('src/circuits/season-review/madrid-main-candidate.json').read_text('utf8'));data=json.loads(original)
import hashlib
assert hashlib.sha256(original).hexdigest()==candidate['generatedSha256'],'Rebuild candidate for changed runtime package first'
preview=original
try:
 for a in candidate['areas']:
  assert a['roadIntersectionMetres2']==0 and not a['otherZoneIntersections']
  zone=next(z for z in data['spectatorZones'] if z['zoneId']==a['zoneId']);zone['boundary']=a['candidateBoundary'];zone['surfaces'][0]['boundary']=a['candidateBoundary'];zone['surfaces'][0].pop('frontReference',None);zone['availability']='available';zone['geometryReview']={'checkedAt':'2026-10-26','issues':[],'method':'Temporary source-boundary preview, not accepted annual geometry.'}
 preview=json.dumps(data,ensure_ascii=False,separators=(',',':')).encode('utf8');path.write_bytes(preview)
 with open('.tools/madrid-main-preview-build.log','w') as log:subprocess.run(['node','node_modules/vite/bin/vite.js','build'],stdout=log,stderr=subprocess.STDOUT,check=True)
 env=os.environ.copy();env['MADRING_MAIN_PREVIEW']='1'
 with open('.tools/madrid-main-preview-e2e.log','w') as log:result=subprocess.run(['node','node_modules/@playwright/test/cli.js','test','e2e/madrid-main-candidate.spec.ts','--reporter=line'],env=env,stdout=log,stderr=subprocess.STDOUT)
 print('Preview e2e exit',result.returncode,flush=True)
 if result.returncode:raise SystemExit(result.returncode)
finally:
 if path.read_bytes()!=preview:raise RuntimeError('Circuit changed during preview; preserve current edits and inspect before restoration')
 path.write_bytes(original)
 with open('.tools/madrid-main-restored-build.log','w') as log:subprocess.run(['node','node_modules/vite/bin/vite.js','build'],stdout=log,stderr=subprocess.STDOUT,check=True)
 print('Source and baseline production build restored',flush=True)
