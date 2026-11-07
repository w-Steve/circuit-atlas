import json,copy,importlib.util
from pathlib import Path
from shapely.geometry import Polygon,shape
R=Path('.');read=lambda p:json.loads((R/p).read_text('utf8'));r=read('src/circuits/americas/austin-club-si-2026.json');d=read('src/circuits/generated/austin.json');spec=importlib.util.spec_from_file_location('patch',R/'scripts/apply-austin-club-si.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert m.apply(d,r)==d
old=copy.deepcopy(d);old['spectatorZones']=[copy.deepcopy(r['beforeZones'][0]) if z['zoneId']=='turn-12' else z for z in old['spectatorZones'] if z['zoneId']!='club-si'];assert m.apply(old,r)==d
bad=copy.deepcopy(d);next(z for z in bad['spectatorZones'] if z['zoneId']=='club-si')['name']='independent'
try:m.apply(bad,r)
except ValueError:pass
else:raise AssertionError('Lost independent ClubSI edit')
p=read('research/season-review/austin-2026/pam-layout-sanitized.json');features={}
def walk(v):
 if isinstance(v,dict):
  if v.get('type')=='Feature' and v.get('id') in [r['evidence']['clubFeatureId'],r['evidence']['ordinaryT12FeatureId']]:features[v['id']]=v
  for a in v.values():walk(a)
 elif isinstance(v,list):
  for a in v:walk(a)
walk(p);short=Polygon(r['zones'][1]['boundary']);assert shape(features[r['evidence']['clubFeatureId']]['geometry']).intersection(short).area/short.area>.9999;assert shape(features[r['evidence']['ordinaryT12FeatureId']]['geometry']).intersection(short).area<1e-12
assert next(l for l in p['locations'] if l['id']==290480)['displayText']=='Club SI'
print('Official named polygon crosswalk and migration replay/idempotence/edit protection passed.')
