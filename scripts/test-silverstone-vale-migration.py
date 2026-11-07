"""Exercise native Vale migration and the real generator/audit in isolation."""
import ast,copy,hashlib,json,shutil,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE='src/circuits/europe/silverstone-vale-2026.json'
read=lambda p:json.loads(p.read_text('utf8'))
class Migration(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='f1-vale-');self.root=Path(self.temp.name)
  self.files=['scripts/apply-silverstone-vale.py',SOURCE,'src/circuits/generated/silverstone.json','src/circuits/barriers/silverstone-vale.json']
  for name in self.files:
   path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,path)
  self.source=read(self.root/SOURCE);self.path=self.root/self.files[2];data=read(self.path);data['spectatorZones']=[self.source['oldZone'] if z['zoneId']=='vale' else z for z in data['spectatorZones']];self.save(self.path,data)
 def tearDown(self):self.temp.cleanup()
 def save(self,path,data):path.write_text(json.dumps(data,ensure_ascii=False),'utf8')
 def apply(self):return subprocess.run([sys.executable,str(self.root/self.files[0])],capture_output=True)
 def outputs(self):return [(self.root/p).read_bytes() for p in self.files[2:]]
 def test_replay_and_other_zones(self):
  before=read(self.path);self.assertEqual(self.apply().returncode,0);once=self.outputs();self.assertEqual(self.apply().returncode,0);self.assertEqual(once,self.outputs());after=read(self.path)
  self.assertEqual([z for z in before['spectatorZones'] if z['zoneId']!='vale'],[z for z in after['spectatorZones'] if z['zoneId']!='vale'])
  for key in ['trackGeometry','corners','elevation','spectatorZoneAliases']:self.assertEqual(before.get(key),after.get(key))
 def test_independent_edit_and_acceptance_guards(self):
  for name,mutate in [(self.files[2],lambda d:next(z for z in d['spectatorZones'] if z['zoneId']=='vale')['surfaces'][0].update(eyeHeight=1.4)),(self.files[2],lambda d:d['elevation'].update(notes='independent')),(self.files[3],lambda d:d['barriers'][0].update(heightMetres=4)),(SOURCE,lambda d:d['sceneAcceptance'].update(accepted=False)),(SOURCE,lambda d:d['zone']['surfaces'][0].update(rowPitch={'treadMetres':1.1,'riserMetres':.54}))]:
   path=self.root/name;original=path.read_bytes();data=json.loads(original);mutate(data);self.save(path,data);before=self.outputs();self.assertNotEqual(self.apply().returncode,0);self.assertEqual(before,self.outputs());path.write_bytes(original)
 def test_actual_generator_keeps_source_front_and_required_fence(self):
  data=read(self.path);tree=ast.parse((ROOT/'scripts/build-europe-spectators.py').read_text('utf8'));node=next(n for n in ast.walk(tree) if isinstance(n,ast.If) and ast.unparse(n.test)=="id == 'silverstone'" and 'vale_path' in ast.unparse(n))
  scope={'id':'silverstone','root':ROOT,'data':data,'zones':copy.deepcopy(data['spectatorZones']),'read':lambda p:read(ROOT/p),'hashlib':hashlib,'json':json};exec(compile(ast.Module(body=node.body,type_ignores=[]),'actual-generator','exec'),scope)
  self.assertEqual(next(z for z in scope['zones'] if z['zoneId']=='vale'),self.source['zone'])
 def test_actual_geometry_audit(self):
  self.assertEqual(self.apply().returncode,0);before=read(self.path)
  for name in ['scripts/audit-europe-spectators.py','src/circuits/europe/silverstone-boxpark-2026.json','src/circuits/generated/summaries.json']:
   path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,path)
  metric=read(ROOT/'artifacts/goal-review/silverstone-standing-metric.json');metric['id']='silverstone';metric['road']=[[p[0],0,p[1]] for p in metric['road']];folder=self.root/'artifacts/map-audit';folder.mkdir(parents=True);self.save(folder/'metric-geometry.json',[metric]);self.save(self.root/'src/circuits/europe/geometry-review.json',[])
  result=subprocess.run([sys.executable,str(self.root/'scripts/audit-europe-spectators.py'),'europe','--circuit=silverstone'],capture_output=True);self.assertEqual(result.returncode,0,result.stderr.decode(errors='replace'))
  zone=next(z for z in read(self.path)['spectatorZones'] if z['zoneId']=='vale');self.assertEqual(zone['availability'],'available');self.assertEqual(zone['surfaces'],self.source['zone']['surfaces']);self.assertEqual(self.apply().returncode,0)
  # The old pit-entry trimming rule must not alter the new native footprint.
  for name in ['scripts/constrain-spectator-footprints.py','src/circuits/facilities/silverstone.json']:
   path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,path)
  rules=read(ROOT/'src/circuits/season-review/footprint-constraints.json');rules['constraints']=[r for r in rules['constraints'] if r['circuitId']=='silverstone' and r['zoneId']=='vale'];self.assertTrue(rules['constraints'])
  path=self.root/'src/circuits/season-review/footprint-constraints.json';path.parent.mkdir(parents=True);self.save(path,rules);(self.root/'artifacts/goal-review').mkdir()
  before=self.path.read_bytes();result=subprocess.run([sys.executable,str(self.root/'scripts/constrain-spectator-footprints.py')],capture_output=True);self.assertEqual(result.returncode,0,result.stderr.decode(errors='replace'));self.assertEqual(before,self.path.read_bytes())
if __name__=='__main__':unittest.main()
