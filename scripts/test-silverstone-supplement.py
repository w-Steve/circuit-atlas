"""Migration must replay, remain idempotent and protect independent edits."""
import copy,importlib.util,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('supplement',ROOT/'scripts/apply-silverstone-supplement.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
g=read('src/circuits/generated/silverstone.json');r=read('src/circuits/europe/silverstone-supplement-2026.json')
assert m.apply(g,r)==g
old=copy.deepcopy(g)
old['spectatorZones']=[next((b for b in r['beforeZones'] if b['zoneId']==z['zoneId']),z) for z in old['spectatorZones'] if z['zoneId']!='international-paddock-grandstand']
replayed=m.apply(old,r)
assert {z['zoneId']:z for z in replayed['spectatorZones']}=={z['zoneId']:z for z in g['spectatorZones']}
assert set(replayed['spectatorZoneIds'])==set(g['spectatorZoneIds'])
assert m.apply(replayed,r)==replayed
bad=copy.deepcopy(g);next(z for z in bad['spectatorZones'] if z['zoneId']=='the-loop')['name']='independent change'
try:m.apply(bad,r)
except ValueError:pass
else:raise AssertionError('Independent edit overwritten')
print('Silverstone supplement migration passed')
