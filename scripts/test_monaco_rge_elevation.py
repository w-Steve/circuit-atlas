"""Offline migration/rebuild checks; never changes the working circuit package."""
import copy,json,tempfile,unittest
from pathlib import Path
import regional_elevation as regional
import monaco_rge_elevation as ign

class MonacoRegionalTests(unittest.TestCase):
 def setUp(self):
  self.record=json.loads(ign.OUT.read_text('utf8'))
  self.record['sceneAcceptance']={'accepted':False,'reason':'Unaccepted fixture exercises preview guard.'}

 def test_rebuild_is_exact_and_rejects_missing_edge_evidence(self):
  with tempfile.TemporaryDirectory() as folder:
   output=Path(folder)/'grid.json'
   record=copy.deepcopy(self.record);ign.rebuild(record,output)
   self.assertEqual(record['grid'],self.record['grid'])
   record['directEdgeProbes']=[]
   with self.assertRaisesRegex(ValueError,'direct source query'):ign.rebuild(record,output)

 def test_preview_is_explicit_idempotent_and_protects_edited_terrain(self):
  original_root,original_dest=regional.ROOT,regional.DEST
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);dest=root/'src/circuits/elevation-source/regional-grids';dest.mkdir(parents=True)
   package=root/'src/circuits/generated/monaco.json';package.parent.mkdir(parents=True)
   coverage=dest.parent/'coverage.json'
   data={'elevation':self.record['previousElevation'],'dataSources':[]}
   package.write_text(json.dumps(data),'utf8');coverage.write_text('[{"circuitId":"monaco"}]','utf8')
   (dest/'monaco.json').write_text(json.dumps(self.record),'utf8')
   regional.ROOT,regional.DEST=root,dest
   try:
    before=package.read_bytes()
    with self.assertRaisesRegex(ValueError,'explicit --preview'):regional.apply(['monaco'])
    self.assertEqual(before,package.read_bytes())
    regional.apply(['monaco'],preview=True);applied=package.read_bytes()
    regional.apply(['monaco'],preview=True);self.assertEqual(applied,package.read_bytes())
    changed=json.loads(applied);changed['elevation']['grid']['heights'][0]+=1
    package.write_text(json.dumps(changed),'utf8');edited=package.read_bytes()
    with self.assertRaisesRegex(ValueError,'preserve edits'):regional.apply(['monaco'],preview=True)
    self.assertEqual(edited,package.read_bytes())
   finally:regional.ROOT,regional.DEST=original_root,original_dest

if __name__=='__main__':unittest.main()
