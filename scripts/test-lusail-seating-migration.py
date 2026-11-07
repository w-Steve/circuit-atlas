"""Exercise migration guards in memory without modifying project data."""
import copy,importlib.util,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('migration',ROOT/'scripts/apply-lusail-seating.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=json.loads((ROOT/'src/circuits/asia/lusail-t2-t3-2026.json').read_text('utf8'))
current=json.loads((ROOT/'src/circuits/generated/lusail.json').read_text('utf8'))
old=copy.deepcopy(current)
old['spectatorZones']=[z for z in old['spectatorZones'] if z['zoneId'] not in ['t2','t3']]+r['oldZones']
old['spectatorZoneIds']=[z['zoneId'] for z in old['spectatorZones'] if z['availability']=='available']
assert m.migrate(old,r)==current
assert m.migrate(current,r)==current
for change in ['duplicate','neighbor','road','payload','unaccepted']:
 d=copy.deepcopy(old);review=copy.deepcopy(r)
 if change=='duplicate':d['spectatorZones']+=r['zones']
 if change=='neighbor':d['spectatorZones'][0]['name']='Independent edit'
 if change=='road':d['trackGeometry']['widthMetres']+=1
 if change=='payload':review['zones'][0]['surfaces'][0]['rise']+=1
 if change=='unaccepted':review['sceneAcceptance']['accepted']=False
 try:m.migrate(d,review)
 except ValueError:pass
 else:raise AssertionError(change)
assert m.reviewed_zones(current,r)==r['zones']
print('8 migration/rebuild assertions passed; files unchanged.')
