"""Check actual candidate road mesh and retained public/pit/building footprints."""
import json
from pathlib import Path
from shapely.geometry import Polygon
from shapely.ops import unary_union
root=Path(__file__).resolve().parents[1]
path=root/'artifacts/goal-review/silverstone-ea/footprints.json'
data=json.loads(path.read_text('utf8'))
roads=unary_union([Polygon(t) for t in data['roads']])
pits=unary_union([Polygon(t) for t in data['pits']])
buildings=unary_union([Polygon(t) for t in data['buildings']])
zones=[(z['id'],Polygon(z['boundary'])) for z in data['zones']]
issues=[]
for i,(name,shape) in enumerate(zones):
 if not shape.is_valid:raise ValueError(f'Invalid source boundary {name}')
 for label,target in [('road',roads),('pit',pits),('building',buildings),*zones[i+1:]]:
  area=shape.intersection(target).area
  if area>1e-6:issues.append({'zone':name,'other':label,'areaMetres2':area})
report={'zones':len(zones),'issues':issues}
path.with_name('footprint-audit.json').write_text(json.dumps(report,indent=2)+'\n','utf8')
print(json.dumps(report))
if issues:raise ValueError('Unresolved candidate footprint intersections')
