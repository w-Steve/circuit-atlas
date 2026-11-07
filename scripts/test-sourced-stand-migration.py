"""Check the real replacement command using isolated disposable fixtures."""
import copy,json,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
class ReplacementMigration(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='circuit-atlas-replacement-');self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
  (self.root/'scripts').mkdir();(self.root/'scripts/apply-sourced-stand.py').write_bytes((ROOT/'scripts/apply-sourced-stand.py').read_bytes())
  self.source=read('src/circuits/europe/silverstone-village-a-2026.json');self.source['zone']['availability']='available';self.source['zone']['geometryReview']['issues']=[];self.source['sceneAcceptance']={'accepted':True}
  self.data=read('src/circuits/generated/silverstone.json');self.data['spectatorZones']=[self.source['oldZone'] if z['zoneId']=='village-a' else z for z in self.data['spectatorZones']]
  self.summaries=read('src/circuits/generated/summaries.json');self.runtime=self.root/'src/circuits/generated/silverstone.json';self.summary=self.runtime.with_name('summaries.json');self.runtime.parent.mkdir(parents=True)
 def save(self,s=None,d=None):
  self.runtime.write_text(json.dumps(d or self.data));self.summary.write_text(json.dumps(self.summaries));(self.root/'source.json').write_text(json.dumps(s or self.source))
 def run_migration(self):return subprocess.run([sys.executable,str(self.root/'scripts/apply-sourced-stand.py'),'--source=source.json'],cwd=self.root,capture_output=True,text=True)
 def test_preserves_other_fields_and_replays(self):
  self.save();r=self.run_migration();self.assertEqual(r.returncode,0,r.stderr);result=json.loads(self.runtime.read_text());result['spectatorZones']=[z for z in result['spectatorZones'] if z['zoneId']!='village-a'];expected=copy.deepcopy(self.data);expected['spectatorZones']=[z for z in expected['spectatorZones'] if z['zoneId']!='village-a'];result.pop('spectatorZoneIds');expected.pop('spectatorZoneIds');self.assertEqual(result,expected)
  before=(self.runtime.read_bytes(),self.summary.read_bytes());self.assertEqual(self.run_migration().returncode,0);self.assertEqual(before,(self.runtime.read_bytes(),self.summary.read_bytes()))
 def test_failed_checks_never_write(self):
  for case in ['year','fingerprint','unaccepted','road-conflict','boundary','independent-zone','duplicate-zone']:
   with self.subTest(case=case):
    s=copy.deepcopy(self.source);d=copy.deepcopy(self.data)
    if case=='year':s['season']=2025
    if case=='fingerprint':s['geometryFingerprint']='stale'
    if case=='unaccepted':s['sceneAcceptance']['accepted']=False
    if case=='road-conflict':s['roadIntersectionMetres2']=1
    if case=='boundary':s['sourceBoundary']=[]
    if case=='independent-zone':next(z for z in d['spectatorZones'] if z['zoneId']=='village-a')['name']='Independent user change'
    if case=='duplicate-zone':d['spectatorZones'].append(copy.deepcopy(next(z for z in d['spectatorZones'] if z['zoneId']=='village-a')))
    self.save(s,d);before=(self.runtime.read_bytes(),self.summary.read_bytes());self.assertNotEqual(self.run_migration().returncode,0);self.assertEqual(before,(self.runtime.read_bytes(),self.summary.read_bytes()))
if __name__=='__main__':unittest.main()
