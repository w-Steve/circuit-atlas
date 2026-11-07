"""Isolated Club replacement, native-front audit and generator replay checks."""
import ast,copy,json,hashlib,shutil,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE='src/circuits/europe/silverstone-club-2026.json'
read=lambda p:json.loads(p.read_text('utf8'))

class Migration(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='f1-club-test-');self.root=Path(self.temp.name)
  for name in ['scripts/apply-silverstone-club.py',SOURCE,'src/circuits/generated/silverstone.json','src/circuits/generated/summaries.json']:
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,p)
  self.source=read(self.root/SOURCE);self.path=self.root/'src/circuits/generated/silverstone.json';data=read(self.path);ids={z['zoneId'] for z in self.source['oldZones']+self.source['zones']}
  data['spectatorZones']=[z for z in data['spectatorZones'] if z['zoneId'] not in ids]+self.source['oldZones'];data.pop('spectatorZoneAliases',None);self.save(self.path,data)
 def tearDown(self):self.temp.cleanup()
 def save(self,p,value):p.write_text(json.dumps(value,ensure_ascii=False),'utf8')
 def apply(self):return subprocess.run([sys.executable,str(self.root/'scripts/apply-silverstone-club.py')],capture_output=True)
 def test_replay_preserves_other_banks_and_archives_retired_links(self):
  before=read(self.path);self.assertEqual(self.apply().returncode,0);once=self.path.read_bytes();self.assertEqual(self.apply().returncode,0);self.assertEqual(once,self.path.read_bytes())
  after=read(self.path);ids={z['zoneId'] for z in self.source['oldZones']+self.source['zones']}
  self.assertEqual([z for z in before['spectatorZones'] if z['zoneId'] not in ids],[z for z in after['spectatorZones'] if z['zoneId'] not in ids]);self.assertEqual(after['spectatorZoneAliases'],self.source['aliases'])
 def test_independent_edits_or_unaccepted_source_refuse_without_writes(self):
  for mutate in [lambda d:d['spectatorZones'][-1]['surfaces'][0].update(eyeHeight=1.4),lambda d:d['elevation'].update(notes='independent'),lambda d:d.update(spectatorZoneAliases={'club-corner-b':'different'})]:
   original=self.path.read_bytes();d=json.loads(original);mutate(d);self.save(self.path,d);before=self.path.read_bytes();self.assertNotEqual(self.apply().returncode,0);self.assertEqual(before,self.path.read_bytes());self.path.write_bytes(original)
  p=self.root/SOURCE;d=read(p);d['sceneAcceptance']['accepted']=False;self.save(p,d);before=self.path.read_bytes();self.assertNotEqual(self.apply().returncode,0);self.assertEqual(before,self.path.read_bytes())
 def test_actual_generator_branch_restores_two_native_banks(self):
  data=read(self.path);tree=ast.parse((ROOT/'scripts/build-europe-spectators.py').read_text('utf8'))
  node=next(n for n in ast.walk(tree) if isinstance(n,ast.If) and ast.unparse(n.test)=="id == 'silverstone'" and 'club_path' in ast.unparse(n))
  scope={'id':'silverstone','root':ROOT,'data':data,'zones':copy.deepcopy(data['spectatorZones']),'read':lambda p:read(ROOT/p),'hashlib':hashlib,'json':json}
  exec(compile(ast.Module(body=node.body,type_ignores=[]),'actual-silverstone-generator','exec'),scope)
  for zone in self.source['zones']:self.assertEqual(next(z for z in scope['zones'] if z['zoneId']==zone['zoneId']),zone)
  self.assertFalse(any(z['zoneId'] in self.source['aliases'] for z in scope['zones']))
 def test_actual_geometry_audit_preserves_authored_fronts(self):
  self.assertEqual(self.apply().returncode,0)
  for name in ['scripts/audit-europe-spectators.py','src/circuits/europe/silverstone-boxpark-2026.json']:
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,p)
  metric=read(ROOT/'artifacts/goal-review/silverstone-standing-metric.json');metric['id']='silverstone';metric['road']=[[p[0],0,p[1]] for p in metric['road']]
  folder=self.root/'artifacts/map-audit';folder.mkdir(parents=True);self.save(folder/'metric-geometry.json',[metric]);self.save(self.root/'src/circuits/europe/geometry-review.json',[])
  r=subprocess.run([sys.executable,str(self.root/'scripts/audit-europe-spectators.py'),'europe','--circuit=silverstone'],capture_output=True);self.assertEqual(r.returncode,0,r.stderr.decode(errors='replace'))
  data=read(self.path)
  for zone in self.source['zones']:
   actual=next(z for z in data['spectatorZones'] if z['zoneId']==zone['zoneId']);self.assertEqual(actual['availability'],'available');self.assertEqual(actual['surfaces'],zone['surfaces'])

if __name__=='__main__':unittest.main()
