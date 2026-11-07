"""Isolated acceptance, replay and independent-edit protection for EA migration."""
import contextlib,copy,io,json,tempfile,unittest
from pathlib import Path
import uk_ea_elevation as ea
ORIGINAL_ROOT,ORIGINAL_OUT=ea.ROOT,ea.OUT
FILES=['src/circuits/generated/silverstone.json','src/circuits/facilities/silverstone.json','src/circuits/europe/silverstone-village-a-2026.json','src/circuits/elevation-source/coverage.json','src/circuits/elevation-source/candidates/silverstone-ea-dtm.json']

class Migration(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='f1-ea-migration-');ea.ROOT=Path(self.temp.name);ea.OUT=ea.ROOT/FILES[-1]
  for name in FILES:
   p=ea.ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ORIGINAL_ROOT/name).read_bytes())
  r=ea.read(ea.OUT);r['runtimeApplied']=False;self.save(FILES[-1],r)
  d=ea.read(ea.ROOT/FILES[0]);d['elevation']=r['previousElevation'];self.save(FILES[0],d)
  self.save(FILES[1],r['previousFacilities'])
  s=ea.read(ea.ROOT/FILES[2]);s['geometryFingerprint']=r['sceneAcceptance']['villageARevalidation']['previousFingerprint'];self.save(FILES[2],s)
 def tearDown(self):ea.ROOT=ORIGINAL_ROOT;ea.OUT=ORIGINAL_OUT;self.temp.cleanup()
 def save(self,name,value):(ea.ROOT/name).write_text(json.dumps(value,ensure_ascii=False),'utf8')
 def snapshot(self):return {name:(ea.ROOT/name).read_bytes() for name in FILES}
 def apply(self):
  with contextlib.redirect_stdout(io.StringIO()):ea.apply()
 def test_apply_is_idempotent_and_preserves_seating_and_facility_footprints(self):
  old=ea.read(ea.ROOT/FILES[0]);self.apply();once=self.snapshot();self.apply();self.assertEqual(once,self.snapshot())
  current=ea.read(ea.ROOT/FILES[0]);record=ea.read(ea.OUT)
  self.assertEqual(current['spectatorZones'],old['spectatorZones'])
  self.assertEqual(current['trackGeometry'],old['trackGeometry'])
  self.assertTrue(ea.retain_applied_elevation('silverstone',current['elevation']))
  for a,b in zip(ea.read(ea.ROOT/FILES[1])['pitLanes'],record['previousFacilities']['pitLanes']):
   a.pop('terrainMeshSpacingMetres');self.assertEqual(a,b)
  with self.assertRaises(ValueError):ea.build()
 def test_unaccepted_or_tampered_grid_cannot_write(self):
  initial=ea.read(ea.OUT)
  for mutate in [lambda r:r['sceneAcceptance'].update(accepted=False),lambda r:r['grid']['heights'].__setitem__(0,r['grid']['heights'][0]+.01)]:
   record=copy.deepcopy(initial);mutate(record);self.save(FILES[-1],record);before=self.snapshot()
   with self.assertRaises(ValueError):self.apply()
   self.assertEqual(before,self.snapshot())
 def test_independent_ground_pit_or_seating_edits_cannot_be_overwritten(self):
  for name,mutate in [
   (FILES[0],lambda d:d['elevation'].update(notes='independent ground edit')),
   (FILES[1],lambda d:d['pitLanes'][0].update(widthMetres=99)),
   (FILES[2],lambda d:d['zone']['surfaces'][0].update(eyeHeight=1.4)),
  ]:
   original=(ea.ROOT/name).read_bytes();d=json.loads(original);mutate(d);self.save(name,d);before=self.snapshot()
   with self.assertRaises(ValueError):self.apply()
   self.assertEqual(before,self.snapshot());(ea.ROOT/name).write_bytes(original)
 def test_coarse_regeneration_refuses_independent_applied_source_edit(self):
  self.apply();elevation=ea.read(ea.ROOT/FILES[0])['elevation'];elevation['notes']='independent'
  with self.assertRaises(ValueError):ea.retain_applied_elevation('silverstone',elevation)
  self.assertFalse(ea.retain_applied_elevation('shanghai',elevation))

if __name__=='__main__':unittest.main()
