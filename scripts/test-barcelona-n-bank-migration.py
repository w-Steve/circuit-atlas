import copy,importlib.util,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('bank',ROOT/'scripts/apply-barcelona-n-bank.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=json.loads((ROOT/'src/circuits/europe/barcelona-n-bank-2026.json').read_text('utf8'))
current=json.loads((ROOT/'src/circuits/generated/barcelona.json').read_text('utf8'))
old=copy.deepcopy(current);old['spectatorZones']=[z for z in old['spectatorZones'] if z['zoneId']!='alonso-land-pelouse'];old['spectatorZoneIds']=[z['zoneId'] for z in old['spectatorZones'] if z['availability']=='available']
assert m.migrate(old,r)==current
assert m.migrate(current,r)==current
for change in ['duplicate','neighbor','ground','bank','fence','unaccepted']:
 d=copy.deepcopy(old);record=copy.deepcopy(r)
 if change=='duplicate':d['spectatorZones']+=r['zones']*2
 if change=='neighbor':d['spectatorZones'][0]['name']='Independent edit'
 if change=='ground':d['trackGeometry']['widthMetres']+=1
 if change=='bank':record['zones'][0]['surfaces'][0]['eyeHeight']+=1
 if change=='fence':record['barrierPackage']['barriers'][0]['heightMetres']+=1
 if change=='unaccepted':record['sceneAcceptance']['accepted']=False
 try:m.migrate(d,record)
 except ValueError:pass
 else:raise AssertionError(change)
assert m.reviewed_zones(current,r)==r['zones']
print('9 bank migration/rebuild assertions passed, files unchanged.')
