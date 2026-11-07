"""Guard parent geometry, native fence and source acceptance during GA migration."""
import ast,copy,hashlib,json,shutil,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE='src/circuits/europe/silverstone-vale-ga-2026.json'
read=lambda path:json.loads(path.read_text('utf8'))
class Migration(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='f1-vale-ga-');self.root=Path(self.temp.name)
  self.files=['scripts/apply-silverstone-vale-ga.py',SOURCE,'src/circuits/europe/silverstone-vale-2026.json','src/circuits/generated/silverstone.json','src/circuits/barriers/silverstone-vale.json','src/circuits/generated/summaries.json']
  for name in self.files:
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,p)
  self.source=read(self.root/SOURCE);self.path=self.root/self.files[3];d=read(self.path);d['spectatorZones']=[z for z in d['spectatorZones'] if z['zoneId']!='ga-vale'];self.save(self.path,d)
 def tearDown(self):self.temp.cleanup()
 def save(self,path,value):path.write_text(json.dumps(value,ensure_ascii=False),'utf8')
 def apply(self):return subprocess.run([sys.executable,str(self.root/self.files[0])],capture_output=True)
 def outputs(self):return [(self.root/p).read_bytes() for p in self.files[3:]]
 def test_replay_preserves_parent_fence_and_existing_zones(self):
  before=read(self.path);fence=(self.root/self.files[4]).read_bytes();self.assertEqual(self.apply().returncode,0);once=self.outputs();self.assertEqual(self.apply().returncode,0);self.assertEqual(once,self.outputs());after=read(self.path)
  self.assertEqual(before['spectatorZones'],[z for z in after['spectatorZones'] if z['zoneId']!='ga-vale']);self.assertEqual(fence,(self.root/self.files[4]).read_bytes())
  for key in ['trackGeometry','corners','elevation','spectatorZoneAliases']:self.assertEqual(before.get(key),after.get(key))
 def test_guard_failures_write_nothing(self):
  for name,mutate in [(self.files[3],lambda d:next(z for z in d['spectatorZones'] if z['zoneId']=='vale')['surfaces'][0].update(eyeHeight=1.4)),(self.files[3],lambda d:next(z for z in d['spectatorZones'] if z['zoneId']=='vale')['geometryReview'].update(issues=['known issue'])),(self.files[3],lambda d:d['elevation'].update(notes='independent')),(self.files[4],lambda d:d['barriers'][0].update(heightMetres=4)),(SOURCE,lambda d:d['sceneAcceptance'].update(accepted=False)),(SOURCE,lambda d:d['zone']['surfaces'][0].update(eyeHeight=1.8)),(self.files[2],lambda d:d['zone']['surfaces'][0].update(rise=9)),(self.files[2],lambda d:d['gaEvidence']['nativeGroundBoundary'][0].__setitem__(0,-1.1))]:
   path=self.root/name;original=path.read_bytes();d=json.loads(original);mutate(d);self.save(path,d);before=self.outputs();self.assertNotEqual(self.apply().returncode,0);self.assertEqual(before,self.outputs());path.write_bytes(original)
  self.assertEqual(self.apply().returncode,0);d=read(self.path);next(z for z in d['spectatorZones'] if z['zoneId']=='ga-vale')['surfaces'][0]['eyeHeight']=1.7;self.save(self.path,d);before=self.outputs();self.assertNotEqual(self.apply().returncode,0);self.assertEqual(before,self.outputs())
 def test_actual_generator_retains_accepted_subset(self):
  d=read(self.path);tree=ast.parse((ROOT/'scripts/build-europe-spectators.py').read_text('utf8'));node=next(n for n in ast.walk(tree) if isinstance(n,ast.If) and ast.unparse(n.test)=="id == 'silverstone'" and 'vale_ga_path' in ast.unparse(n))
  scope={'id':'silverstone','root':ROOT,'data':d,'zones':copy.deepcopy(d['spectatorZones']),'read':lambda p:read(ROOT/p),'hashlib':hashlib,'json':json};exec(compile(ast.Module(body=node.body,type_ignores=[]),'actual-generator','exec'),scope)
  self.assertEqual(next(z for z in scope['zones'] if z['zoneId']=='ga-vale'),self.source['zone']);self.assertEqual(sum(z['zoneId']=='ga-vale' for z in scope['zones']),1)
 def test_actual_road_audit_preserves_ground_and_standing_height(self):
  self.assertEqual(self.apply().returncode,0)
  for name in ['scripts/audit-europe-spectators.py','src/circuits/europe/silverstone-boxpark-2026.json']:
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,p)
  metric=read(ROOT/'artifacts/goal-review/silverstone-standing-metric.json');metric['id']='silverstone';metric['road']=[[p[0],0,p[1]] for p in metric['road']];folder=self.root/'artifacts/map-audit';folder.mkdir(parents=True);self.save(folder/'metric-geometry.json',[metric]);self.save(self.root/'src/circuits/europe/geometry-review.json',[])
  result=subprocess.run([sys.executable,str(self.root/'scripts/audit-europe-spectators.py'),'europe','--circuit=silverstone'],capture_output=True);self.assertEqual(result.returncode,0,result.stderr.decode(errors='replace'));zone=next(z for z in read(self.path)['spectatorZones'] if z['zoneId']=='ga-vale');self.assertEqual(zone['availability'],'available');self.assertEqual(zone['surfaces'],self.source['zone']['surfaces']);self.assertEqual(self.apply().returncode,0)
if __name__=='__main__':unittest.main()
