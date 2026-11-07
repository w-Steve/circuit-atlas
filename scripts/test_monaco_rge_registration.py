"""Offline terrain-only migration guards using isolated copies of reviewed data."""
import copy,importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('migration',Path(__file__).with_name('migrate-monaco-rge-registration.py'))
migration=importlib.util.module_from_spec(spec);spec.loader.exec_module(migration)

class RegistrationTests(unittest.TestCase):
 def setUp(self):
  self.folder=tempfile.TemporaryDirectory();self.addCleanup(self.folder.cleanup)
  self.original=migration.ROOT;self.addCleanup(setattr,migration,'ROOT',self.original)
  migration.ROOT=Path(self.folder.name)
  for name in ['src/circuits/generated/monaco.json','src/circuits/elevation-source/regional-grids/monaco-ign-rge.json',
   'src/circuits/season-review/monaco-rge-preview-review.json','src/circuits/europe/monaco-standing-world.json',
   'artifacts/goal-review/monaco-standing-metric.json']:
   p=migration.ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((self.original/name).read_bytes())

 def write(self,name,value):(migration.ROOT/name).write_text(json.dumps(value),'utf8')

 def test_retains_exact_geographic_boundary_and_replays_without_change(self):
  name='src/circuits/europe/monaco-standing-world.json';before=migration.read(name)
  migration.migrate();after=migration.read(name)
  self.assertEqual(before['zones'][0]['boundary'],after['zones'][0]['boundary'])
  self.assertEqual(before['zones'][0]['surfaces'],after['zones'][0]['surfaces'])
  self.assertGreater(after['roadClearanceMetres'],1)
  raw=(migration.ROOT/name).read_bytes();migration.migrate();self.assertEqual(raw,(migration.ROOT/name).read_bytes())

 def test_rejects_changed_track_or_zone_without_overwriting_registration(self):
  package='src/circuits/generated/monaco.json';original=migration.read(package)
  world=migration.ROOT/'src/circuits/europe/monaco-standing-world.json';snapshot=world.read_bytes()
  for field in ['track','zone']:
   changed=copy.deepcopy(original)
   if field=='track':changed['trackGeometry']['widthMetres']+=1
   else:next(z for z in changed['spectatorZones'] if z['zoneId']=='z-quai-kennedy')['surface']['eyeHeight']+=.1
   self.write(package,changed)
   with self.assertRaises(ValueError):migration.migrate()
   self.assertEqual(snapshot,world.read_bytes())

if __name__=='__main__':unittest.main()
