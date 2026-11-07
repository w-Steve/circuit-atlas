"""Isolated source acceptance, replay, generator and actual road-audit checks."""
import ast,copy,hashlib,json,shutil,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE='src/circuits/europe/silverstone-farm-ga-2026.json'
read=lambda p:json.loads(p.read_text('utf8'))
class Migration(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='f1-farm-ga-');self.root=Path(self.temp.name)
  self.files=['scripts/apply-silverstone-farm-ga.py',SOURCE,'src/circuits/generated/silverstone.json','src/circuits/generated/summaries.json','src/circuits/barriers/silverstone-farm.json']
  for name in self.files:
   path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,path)
  self.source=read(self.root/SOURCE);self.path=self.root/self.files[2];d=read(self.path);d['spectatorZones']=[self.source['oldStand'] if z['zoneId']=='farm-curve' else z for z in d['spectatorZones'] if z['zoneId']!='ga-farm-curve'];self.save(self.path,d)
 def tearDown(self):self.temp.cleanup()
 def save(self,path,d):path.write_text(json.dumps(d,ensure_ascii=False),'utf8')
 def apply(self):return subprocess.run([sys.executable,str(self.root/self.files[0])],capture_output=True)
 def outputs(self):return [(self.root/p).read_bytes() for p in self.files[2:]]
 def test_replay_and_existing_physics(self):
  before=read(self.path);self.assertEqual(self.apply().returncode,0);once=self.outputs();self.assertEqual(self.apply().returncode,0);self.assertEqual(once,self.outputs());after=read(self.path)
  self.assertEqual([z for z in before['spectatorZones'] if z['zoneId']!='farm-curve'],[z for z in after['spectatorZones'] if z['zoneId'] not in ['farm-curve','ga-farm-curve']])
  old=next(z for z in before['spectatorZones'] if z['zoneId']=='farm-curve')['surfaces'][0];new=next(z for z in after['spectatorZones'] if z['zoneId']=='farm-curve')['surfaces'][0];self.assertEqual(old,{k:v for k,v in new.items() if k!='fenceMode'})
  for key in ['trackGeometry','corners','elevation']:self.assertEqual(before[key],after[key])
 def test_independent_edits_and_unaccepted_source_refuse_without_writes(self):
  for name,mutate in [(self.files[2],lambda d:next(z for z in d['spectatorZones'] if z['zoneId']=='farm-curve')['surfaces'][0].update(eyeHeight=1.4)),(self.files[2],lambda d:d['elevation'].update(notes='independent')),(self.files[4],lambda d:d['barriers'][0].update(heightMetres=4)),(SOURCE,lambda d:d['sceneAcceptance'].update(accepted=False)),(SOURCE,lambda d:d['zone']['surfaces'][0].update(terrainMeshSpacingMetres=8))]:
   path=self.root/name;original=path.read_bytes();d=json.loads(original);mutate(d);self.save(path,d);before=self.outputs();self.assertNotEqual(self.apply().returncode,0);self.assertEqual(before,self.outputs());path.write_bytes(original)
  self.assertEqual(self.apply().returncode,0);d=read(self.path);next(z for z in d['spectatorZones'] if z['zoneId']=='ga-farm-curve')['surfaces'][0]['eyeHeight']=1.8;self.save(self.path,d);before=self.outputs();self.assertNotEqual(self.apply().returncode,0);self.assertEqual(before,self.outputs())
 def test_actual_generator_keeps_native_graph_and_fine_surface(self):
  d=read(self.path);tree=ast.parse((ROOT/'scripts/build-europe-spectators.py').read_text('utf8'));node=next(n for n in ast.walk(tree) if isinstance(n,ast.If) and ast.unparse(n.test)=="id == 'silverstone'" and 'farm_ga_path' in ast.unparse(n));scope={'id':'silverstone','root':ROOT,'data':d,'zones':copy.deepcopy(d['spectatorZones']),'read':lambda p:read(ROOT/p),'hashlib':hashlib,'json':json};exec(compile(ast.Module(body=node.body,type_ignores=[]),'actual-generator','exec'),scope)
  for zone in [self.source['zone'],self.source['stand']]:self.assertEqual(next(z for z in scope['zones'] if z['zoneId']==zone['zoneId']),zone)
 def test_actual_road_audit_preserves_continuous_ground(self):
  self.assertEqual(self.apply().returncode,0)
  for name in ['scripts/audit-europe-spectators.py','src/circuits/europe/silverstone-boxpark-2026.json']:
   path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,path)
  metric=read(ROOT/'artifacts/goal-review/silverstone-standing-metric.json');metric['id']='silverstone';metric['road']=[[p[0],0,p[1]] for p in metric['road']];folder=self.root/'artifacts/map-audit';folder.mkdir(parents=True);self.save(folder/'metric-geometry.json',[metric]);self.save(self.root/'src/circuits/europe/geometry-review.json',[])
  result=subprocess.run([sys.executable,str(self.root/'scripts/audit-europe-spectators.py'),'europe','--circuit=silverstone'],capture_output=True);self.assertEqual(result.returncode,0,result.stderr.decode(errors='replace'));zone=next(z for z in read(self.path)['spectatorZones'] if z['zoneId']=='ga-farm-curve');self.assertEqual(zone['availability'],'available');self.assertEqual(zone['surfaces'],self.source['zone']['surfaces']);self.assertEqual(self.apply().returncode,0)
if __name__=='__main__':unittest.main()
