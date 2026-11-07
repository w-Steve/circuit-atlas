"""Geographic math and failure guards for the cached Rocher reference."""
import importlib.util,json,tempfile,unittest
from pathlib import Path
from PIL import Image
from pyproj import Transformer

SPEC=importlib.util.spec_from_file_location('rocher',Path(__file__).with_name('fetch-monaco-rocher-topography.py'))
M=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(M)

class ReferenceTests(unittest.TestCase):
    def test_projection_matches_independent_crs_transform(self):
        inverse=Transformer.from_crs(3857,4326,always_xy=True);extent=20037508.342789244
        x,y=M.tile_at(7.423,43.733)
        for u,v in [(0,0),(128,128),(256,256)]:
            gx=x*256+u;gy=y*256+v;n=256*2**M.ZOOM
            lon,lat=inverse.transform(gx/n*2*extent-extent,extent-gy/n*2*extent)
            result=M.geographic(gx,gy)
            self.assertAlmostEqual(result[0],lon,places=10);self.assertAlmostEqual(result[1],lat,places=10)

    def test_offline_replay_preserves_report(self):
        target=M.ROOT/'src/circuits/season-review/monaco-rocher-geographic-reference.json';before=target.read_bytes()
        M.build(offline=True);self.assertEqual(before,target.read_bytes())

    def test_invalid_reference_does_not_replace_report(self):
        root,cache=M.ROOT,M.CACHE
        try:
            with tempfile.TemporaryDirectory(dir=root/'.tools',prefix='rocher-reference-guard-') as tmp:
                M.ROOT=Path(tmp);M.CACHE=M.ROOT/'cache';M.CACHE.mkdir()
                target=M.ROOT/'src/circuits/season-review/monaco-rocher-geographic-reference.json';target.parent.mkdir(parents=True);target.write_text('sentinel','utf8')
                meta=json.loads((cache/'metadata.json').read_text('utf8'));meta['spatialReference']['latestWkid']=4326
                (M.CACHE/'metadata.json').write_text(json.dumps(meta),'utf8')
                with self.assertRaises(AssertionError):M.build(offline=True)
                meta['spatialReference']['latestWkid']=3857;(M.CACHE/'metadata.json').write_text(json.dumps(meta),'utf8')
                with self.assertRaises(ValueError):M.build(offline=True)
                x,y=M.tile_at(7.4165,43.737);Image.new('RGB',(1,1)).save(M.CACHE/f'{M.ZOOM}-{x}-{y}.png')
                with self.assertRaises(AssertionError):M.build(offline=True)
                self.assertEqual(target.read_text('utf8'),'sentinel')
        finally:M.ROOT=root;M.CACHE=cache

if __name__=='__main__':unittest.main()
