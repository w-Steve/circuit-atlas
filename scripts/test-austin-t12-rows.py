import copy,json,importlib.util,math
from pathlib import Path
from shapely.geometry import Polygon
R=Path('.');read=lambda p:json.loads((R/p).read_text('utf8'))
r=read('src/circuits/americas/austin-t12-rows-2026.json');d=read('src/circuits/generated/austin.json')
spec=importlib.util.spec_from_file_location('patch','scripts/apply-austin-t12-rows.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert m.apply(d,r)==d
old=copy.deepcopy(d);old['spectatorZones']=[copy.deepcopy(r['beforeZones'][0]) if z['zoneId']=='turn-12' else z for z in old['spectatorZones']];old['scene']['regions']=[x for x in old['scene']['regions'] if x['zoneId']!='turn-12'];splitSpec=importlib.util.spec_from_file_location('split',R/'scripts/apply-austin-club-si.py');split=importlib.util.module_from_spec(splitSpec);splitSpec.loader.exec_module(split)
assert split.apply(m.apply(old,r),read('src/circuits/americas/austin-club-si-2026.json'))==d
for kind in ['zone']:
 b=copy.deepcopy(d)
 if kind=='zone':next(z for z in b['spectatorZones'] if z['zoneId']=='turn-12')['name']='independent'
 else:b['scene']['regions'][0]['label']='independent'
 try:m.apply(b,r)
 except ValueError:pass
 else:raise AssertionError('Lost independent '+kind)
o=d['trackGeometry']['coordinates'][0];sx=111320*math.cos(math.radians(o[1]));poly=lambda a:Polygon([((x-o[0])*sx,(y-o[1])*111320) for x,y in a])
from shapely.ops import unary_union
outer=unary_union([poly(s['boundary']) for s in r['beforeZones'][0]['surfaces']])
for s in r['zones'][0]['surfaces']:assert poly(s['boundary']).difference(outer).area<.001
print('Replay, idempotence, independent region/zone guards and retained outer footprint passed.')
