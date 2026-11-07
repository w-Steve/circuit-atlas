"""Replay and conflict tests in disposable copies; never mutate the workspace."""
import ast,copy,importlib.util,json,shutil,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Migration(unittest.TestCase):
 area='Gold7';record_name='spa-gold7-2026.json'
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='f1-spa-gold7-');self.root=Path(self.temp.name)
  self.files=['src/circuits/europe/'+self.record_name,'src/circuits/generated/spa.json','src/circuits/generated/summaries.json','src/circuits/facilities/spa.json']
  for name in self.files:
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,p)
  (self.root/'src/circuits/barriers').mkdir()
  (self.root/'scripts').mkdir();shutil.copyfile(ROOT/'scripts/apply-spa-gold7.py',self.root/'scripts/apply-spa-gold7.py')
  spec=importlib.util.spec_from_file_location('gold7',ROOT/'scripts/apply-spa-gold7.py');self.module=importlib.util.module_from_spec(spec);spec.loader.exec_module(self.module);self.module.ROOT=self.root
  if self.area!='Gold7':
   from functools import partial
   self.module.apply=partial(self.module.apply,self.record_name,self.area)
  self.record=self.read(self.files[0]);self.data=self.read(self.files[1]);self.data['spectatorZones']=[self.record['oldZone'] if z['zoneId']==self.record['zone']['zoneId'] else z for z in self.data['spectatorZones']];self.data['spectatorZones']=[z for z in self.data['spectatorZones'] if z is not None];self.save(self.files[1],self.data)
 def tearDown(self):self.temp.cleanup()
 def read(self,name):return json.loads((self.root/name).read_text('utf8'))
 def save(self,name,value):(self.root/name).write_text(json.dumps(value,ensure_ascii=False),'utf8')
 def output(self):return [(self.root/p).read_bytes() if (self.root/p).exists() else None for p in self.files[1:]+['src/circuits/barriers/spa-gold7.json']]
 def rejects(self,pattern):
  before=self.output()
  with self.assertRaisesRegex(ValueError,pattern):self.module.apply()
  self.assertEqual(before,self.output())
 def test_replay_preserves_every_other_region(self):
  self.module.apply();once=self.output();self.module.apply();self.assertEqual(once,self.output())
  data=self.read(self.files[1]);self.assertEqual([z for z in data['spectatorZones'] if z['zoneId']!=self.record['zone']['zoneId']],[z for z in self.data['spectatorZones'] if z['zoneId']!=self.record['zone']['zoneId']]);self.assertEqual(data['trackGeometry'],self.data['trackGeometry']);self.assertEqual(data['elevation'],self.data['elevation'])
 def test_target_edits(self):
  if self.record['oldZone'] is None:self.data['spectatorZones'].append(copy.deepcopy(self.record['zone']))
  next(z for z in self.data['spectatorZones'] if z['zoneId']==self.record['zone']['zoneId'])['surface']['rise']+=1;self.save(self.files[1],self.data);self.rejects('independent '+self.area+' edits')
 def test_neighbor_edits(self):
  self.data['spectatorZones'][0]['surface']['rise']+=1;self.save(self.files[1],self.data);self.rejects('neighbors')
 def test_terrain_edits(self):
  self.data['elevation']['samples']=[{'fraction':0,'metres':1}];self.save(self.files[1],self.data);self.rejects('road/terrain')
 def test_facility_edits(self):
  d=self.read(self.files[3]);d['notes']='independent edit';self.save(self.files[3],d);self.rejects('facilities')
 def test_model_changed_after_acceptance(self):
  self.record['zone']['surfaces'][0]['rise']+=1;self.save(self.files[0],self.record);self.rejects('Unaccepted')
 def test_missing_acceptance(self):
  self.record['sceneAcceptance']['accepted']=False;self.save(self.files[0],self.record);self.rejects('Unaccepted')
 def test_barrier_edits(self):
  self.save('src/circuits/barriers/spa-gold7.json',{'independent':True});self.rejects('independent '+self.area+' barrier edits')
 def test_generator_preserves_reviewed_structure(self):
  self.save('src/circuits/barriers/spa-gold7.json',self.record['barrierLayer'])
  tree=ast.parse((ROOT/'scripts/build-europe-spectators.py').read_text('utf8'))
  block=next(n for n in ast.walk(tree) if isinstance(n,ast.If) and self.record_name in ast.unparse(n.test))
  env={'id':'spa','root':self.root,'data':copy.deepcopy(self.data),'zones':copy.deepcopy(self.data['spectatorZones']),'read':self.read}
  exec(compile(ast.Module(body=[block],type_ignores=[]),'gold7-generator','exec'),env)
  self.assertEqual(next(z for z in env['zones'] if z['zoneId']==self.record['zone']['zoneId']),self.record['zone'])
  self.assertEqual(len(env['zones']),len(self.data['spectatorZones'])+(self.record['oldZone'] is None))
class Gold8Migration(Migration):
 area='Gold8';record_name='spa-gold8-2026.json'
class BisMigration(Migration):
 area='Bis';record_name='spa-gold7-bis-2026.json'
if __name__=='__main__':unittest.main()
