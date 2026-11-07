"""Isolated replay, independent-edit refusal and real generator/audit checks."""
import ast,copy,hashlib,json,shutil,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE='src/circuits/europe/silverstone-national-ga-2026.json'
read=lambda path:json.loads(path.read_text('utf8'))
class Migration(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='f1-nps-ga-');self.root=Path(self.temp.name)
  self.files=['scripts/apply-silverstone-national-ga.py',SOURCE,'src/circuits/generated/silverstone.json','src/circuits/generated/summaries.json','src/circuits/barriers/silverstone.json']
  for name in self.files:
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,p)
  self.source=read(self.root/SOURCE);self.path=self.root/'src/circuits/generated/silverstone.json';data=read(self.path)
  data['spectatorZones']=[self.source['oldStand'] if z['zoneId']==self.source['oldStand']['zoneId'] else z for z in data['spectatorZones'] if z['zoneId']!=self.source['zone']['zoneId']]
  self.save(self.path,data)
 def tearDown(self):self.temp.cleanup()
 def save(self,path,data):path.write_text(json.dumps(data,ensure_ascii=False),'utf8')
 def apply(self):return subprocess.run([sys.executable,str(self.root/self.files[0])],capture_output=True)
 def outputs(self):return [(self.root/p).read_bytes() for p in self.files[2:]]
 def test_replay_keeps_other_banks_and_core(self):
  before=read(self.path);self.assertEqual(self.apply().returncode,0);once=self.outputs();self.assertEqual(self.apply().returncode,0);self.assertEqual(once,self.outputs())
  after=read(self.path);ids={self.source['zone']['zoneId'],self.source['oldStand']['zoneId']}
  self.assertEqual([z for z in before['spectatorZones'] if z['zoneId'] not in ids],[z for z in after['spectatorZones'] if z['zoneId'] not in ids])
  for key in ['trackGeometry','corners','elevation']:self.assertEqual(before[key],after[key])
 def test_independent_edits_refuse_without_writes(self):
  for name,mutate in [
   ('src/circuits/generated/silverstone.json',lambda d:next(z for z in d['spectatorZones'] if z['zoneId']=='national-pit-straight')['surfaces'][0].update(eyeHeight=1.4)),
   ('src/circuits/generated/silverstone.json',lambda d:d['elevation'].update(notes='independent')),
   ('src/circuits/barriers/silverstone.json',lambda d:d['barriers'][0].update(heightMetres=4)),
   (SOURCE,lambda d:d['sceneAcceptance'].update(accepted=False)),
   (SOURCE,lambda d:d['zone']['surfaces'][0].update(eyeHeight=1.8)),
  ]:
   path=self.root/name;original=path.read_bytes();data=json.loads(original);mutate(data);self.save(path,data);before=self.outputs()
   self.assertNotEqual(self.apply().returncode,0);self.assertEqual(before,self.outputs());path.write_bytes(original)
 def test_actual_generator_preserves_accepted_ground_and_barriers(self):
  data=read(self.path);tree=ast.parse((ROOT/'scripts/build-europe-spectators.py').read_text('utf8'))
  node=next(n for n in ast.walk(tree) if isinstance(n,ast.If) and ast.unparse(n.test)=="id == 'silverstone'" and 'ga_path' in ast.unparse(n))
  scope={'id':'silverstone','root':ROOT,'data':data,'zones':copy.deepcopy(data['spectatorZones']),'read':lambda p:read(ROOT/p),'hashlib':hashlib,'json':json}
  exec(compile(ast.Module(body=node.body,type_ignores=[]),'actual-silverstone-generator','exec'),scope)
  self.assertEqual(next(z for z in scope['zones'] if z['zoneId']==self.source['zone']['zoneId']),self.source['zone'])
  stand=next(z for z in scope['zones'] if z['zoneId']=='national-pit-straight');self.assertEqual(stand['requiredBarrierIds'],self.source['zone']['requiredBarrierIds']);self.assertEqual(stand['surfaces'][0]['fenceMode'],'authored')
 def test_actual_geometry_audit_preserves_ground_and_replay(self):
  self.assertEqual(self.apply().returncode,0);before=read(self.path)
  for name in ['scripts/audit-europe-spectators.py','src/circuits/europe/silverstone-boxpark-2026.json']:
   path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,path)
  metric=read(ROOT/'artifacts/goal-review/silverstone-standing-metric.json');metric['id']='silverstone';metric['road']=[[p[0],0,p[1]] for p in metric['road']]
  folder=self.root/'artifacts/map-audit';folder.mkdir(parents=True);self.save(folder/'metric-geometry.json',[metric]);self.save(self.root/'src/circuits/europe/geometry-review.json',[])
  result=subprocess.run([sys.executable,str(self.root/'scripts/audit-europe-spectators.py'),'europe','--circuit=silverstone'],capture_output=True);self.assertEqual(result.returncode,0,result.stderr.decode(errors='replace'))
  after=read(self.path)
  for zone_id in [self.source['zone']['zoneId'],'national-pit-straight']:
   old=next(z for z in before['spectatorZones'] if z['zoneId']==zone_id);new=next(z for z in after['spectatorZones'] if z['zoneId']==zone_id)
   self.assertEqual(new['availability'],'available');self.assertEqual(old['surfaces'],new['surfaces']);self.assertEqual(old['requiredBarrierIds'],new['requiredBarrierIds'])
  self.assertEqual(self.apply().returncode,0)
if __name__=='__main__':unittest.main()
