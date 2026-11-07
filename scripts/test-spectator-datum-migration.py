"""Isolated replay and user-edit protection for the Copse D datum migration."""
import json,shutil,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

class Migration(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='f1-datum-test-');self.root=Path(self.temp.name)
  for folder in ['scripts','src/circuits/europe','src/circuits/generated']:(self.root/folder).mkdir(parents=True,exist_ok=True)
  shutil.copyfile(ROOT/'scripts/apply-spectator-datums.py',self.root/'scripts/apply-spectator-datums.py')
  config=json.loads((ROOT/'src/circuits/europe/silverstone-structural-datums.json').read_text('utf8'))
  self.area=next(a for a in config['areas'] if a['zoneId']=='copse-d')
  config['areas']=[self.area]
  (self.root/'src/circuits/europe/silverstone-structural-datums.json').write_text(json.dumps(config),'utf8')
  (self.root/'src/circuits/europe/other-structural-datums.json').write_text('{"circuitId":"other","areas":[]}','utf8')
  self.other=self.root/'src/circuits/generated/other.json';self.other.write_text('{"keep":"independent"}','utf8')
  self.path=self.root/'src/circuits/generated/silverstone.json'
  self.data={'spectatorZones':[{'zoneId':'copse-d','surfaces':[self.area['previousSurface']]}]}
  self.save()
 def save(self):self.path.write_text(json.dumps(self.data),'utf8')
 def run_apply(self):
  return subprocess.run([sys.executable,str(self.root/'scripts/apply-spectator-datums.py'),'--circuit','silverstone'],capture_output=True)
 def tearDown(self):self.temp.cleanup()
 def test_replay_changes_only_ground_reference_and_keeps_other_circuits(self):
  self.assertEqual(self.run_apply().returncode,0)
  applied=self.path.read_bytes();self.assertEqual(self.run_apply().returncode,0);self.assertEqual(applied,self.path.read_bytes())
  self.assertEqual(self.other.read_text('utf8'),'{"keep":"independent"}')
  actual=json.loads(applied)['spectatorZones'][0]['surfaces'][0]
  self.assertEqual(actual.pop('groundReference'),self.area['groundReference'])
  expected={**self.area['previousSurface'],**{k:self.area[k] for k in ['rowStrip','rowBearing'] if k in self.area}}
  self.assertEqual(actual,expected)
 def test_independent_physical_edit_is_rejected_without_write(self):
  self.data['spectatorZones'][0]['surfaces'][0]['eyeHeight']=1.4;self.save();before=self.path.read_bytes()
  self.assertNotEqual(self.run_apply().returncode,0);self.assertEqual(before,self.path.read_bytes())

if __name__=='__main__':unittest.main()
