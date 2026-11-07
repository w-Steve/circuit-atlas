"""Check data replay and edit protection entirely in memory."""
import copy,importlib.util,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('rows',ROOT/'scripts/apply-austin-row-facts.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=json.loads((ROOT/'src/circuits/americas/austin-row-facts-2026.json').read_text('utf8'))
d=json.loads((ROOT/'src/circuits/generated/austin.json').read_text('utf8'))
assert m.apply_facts(d,r)==d
old=copy.deepcopy(d)
for a in r['areas']:
 s=next(s for z in old['spectatorZones'] if z['zoneId']==a['zoneId'] for s in z['surfaces'] if s['surfaceId']==a['surfaceId'])
 s['rows']=a['oldRows']
 for key,value in [('rowRiserMetres',a['oldRiserMetres']),('rowCountSource',a['oldRowCountSource'])]:
  if value is None:s.pop(key,None)
  else:s[key]=value
assert m.apply_facts(old,r)==d
for field in ['rows','rise','baseHeight','boundary']:
 bad=copy.deepcopy(d);s=next(z for z in bad['spectatorZones'] if z['zoneId']=='turn-1')['surfaces'][0]
 if field=='boundary':s[field][0][0]+=.0001
 else:s[field]+=1
 try:m.apply_facts(bad,r)
 except ValueError:pass
 else:raise AssertionError('Overwrote '+field)
assert old!=d
print('7 replay/edit-protection assertions passed, files unchanged.')
