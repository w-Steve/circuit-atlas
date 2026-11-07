import copy,json,importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/monaco.json');r=read('src/circuits/season-review/monaco-withdrawn-public-models.json')
spec=importlib.util.spec_from_file_location('patch',ROOT/'scripts/apply-monaco-m-withdrawal.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert m.apply(d,r)==d
old=copy.deepcopy(d);old['spectatorZones'].append(copy.deepcopy(r['withdrawn'][0]['zone']));assert m.apply(old,r)==d
old['spectatorZones'][-1]['name']='independent edit'
try:m.apply(old,r)
except ValueError:pass
else:raise AssertionError('Overwrote independent candidate edit')
print('Candidate preserved off-runtime; withdrawal replay/idempotence/edit guard passed.')
