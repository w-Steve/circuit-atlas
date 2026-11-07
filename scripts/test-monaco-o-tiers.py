import copy,importlib.util,json,math
from pathlib import Path
from shapely.geometry import Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
r=read('src/circuits/europe/monaco-o-tiers-2026.json');d=read('src/circuits/generated/monaco.json')
spec=importlib.util.spec_from_file_location('patch',ROOT/'scripts/apply-monaco-o-tiers.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert m.apply(d,r)==d
old=copy.deepcopy(d);old['scene']['regions']=[r for r in old['scene']['regions'] if r['zoneId']!='o-piscine'];old['spectatorZones']=[r['beforeZones'][0] if z['zoneId']=='o-piscine' else z for z in old['spectatorZones']];assert m.apply(old,r)==d
bad=copy.deepcopy(d);next(z for z in bad['spectatorZones'] if z['zoneId']=='o-piscine')['name']='independent'
try:m.apply(bad,r)
except ValueError:pass
else:raise AssertionError('Overwrote independent edit')
o=d['trackGeometry']['coordinates'][0];sx=111320*math.cos(math.radians(o[1]));xy=lambda p:((p[0]-o[0])*sx,(p[1]-o[1])*111320)
poly=lambda b:Polygon([xy(a) for a in b])
z=r['zones'][0];parts=[poly(s['boundary']) for s in z['surfaces']];assert parts[0].intersection(parts[1]).area<.001
assert unary_union(parts).symmetric_difference(poly(z['boundary'])).area<.001
print('Tier footprint union, no overlap, migration replay/idempotence/edit protection passed.')
