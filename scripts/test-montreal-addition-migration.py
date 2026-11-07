"""Exercise the actual migration in disposable isolated fixtures, never the checkout."""
import copy,json,subprocess,sys,tempfile,unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))

class AdditionMigration(unittest.TestCase):
 stand="17"
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='circuit-atlas-addition-')
  self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
  (self.root/'scripts').mkdir();(self.root/'scripts/apply-montreal-stand.py').write_bytes((ROOT/'scripts/apply-montreal-stand.py').read_bytes())
  self.zoneId=f'grandstand-{self.stand}'
  self.data=read('src/circuits/generated/montreal.json');self.data['spectatorZones']=[z for z in self.data['spectatorZones'] if z['zoneId']!=self.zoneId];self.data['spectatorZoneIds']=[z for z in self.data['spectatorZoneIds'] if z!=self.zoneId]
  self.source=read(f'src/circuits/americas/montreal-{self.stand}-2026.json');self.source['zone']['availability']='available';self.source['sceneAcceptance']={'accepted':True}
  self.summaries=read('src/circuits/generated/summaries.json')
  self.runtime=self.root/'src/circuits/generated/montreal.json';self.summary=self.runtime.with_name('summaries.json');self.runtime.parent.mkdir(parents=True)
 def save(self,source=None,data=None):
  self.runtime.write_text(json.dumps(data or self.data));self.summary.write_text(json.dumps(self.summaries));(self.root/'source.json').write_text(json.dumps(source or self.source))
 def run_migration(self):
  return subprocess.run([sys.executable,str(self.root/'scripts/apply-montreal-stand.py'),'--source=source.json'],cwd=self.root,capture_output=True,text=True)
 def test_addition_preserves_others_and_replays_without_duplicates(self):
  self.save();result=self.run_migration();self.assertEqual(result.returncode,0,result.stderr)
  current=json.loads(self.runtime.read_text());self.assertEqual(current['spectatorZones'][:-1],self.data['spectatorZones']);self.assertEqual(current['spectatorZones'][-1],self.source['zone'])
  before=(self.runtime.read_bytes(),self.summary.read_bytes());result=self.run_migration();self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(before,(self.runtime.read_bytes(),self.summary.read_bytes()))
 def test_rejections_never_write_runtime_or_summary(self):
  for case in ['wrong-year','unaccepted','blocked','no-addition','changed-boundary','independent-zone','duplicate-zone']:
   with self.subTest(case=case):
    s=copy.deepcopy(self.source);d=copy.deepcopy(self.data)
    if case=='wrong-year':s['season']=2025
    if case=='unaccepted':s['sceneAcceptance']['accepted']=False
    if case=='blocked':s['blockingReview']['unresolved']=True
    if case=='no-addition':s['addition']=False
    if case=='changed-boundary':s['sourceBoundary']=[]
    if case=='independent-zone':
     z=copy.deepcopy(s['zone']);z['name']='Independent user change';d['spectatorZones'].append(z)
    if case=='duplicate-zone':d['spectatorZones']+=[s['zone'],s['zone']]
    self.save(s,d);before=(self.runtime.read_bytes(),self.summary.read_bytes());self.assertNotEqual(self.run_migration().returncode,0);self.assertEqual(before,(self.runtime.read_bytes(),self.summary.read_bytes()))

class PlatformAdditionMigration(AdditionMigration):
 stand='21a'

class NorthPlatformAdditionMigration(AdditionMigration):
 stand='41a'

if __name__=='__main__':unittest.main()
