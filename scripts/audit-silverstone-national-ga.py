"""Check candidate GA against actual shared road mesh and native barrier plans."""
import json,sys
from pathlib import Path
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
vale='--vale' in sys.argv
vale_ga='--vale-ga' in sys.argv
farm_ga='--farm-ga' in sys.argv
path=ROOT/('artifacts/goal-review/silverstone-farm-ga/geometry.json' if farm_ga else 'artifacts/goal-review/silverstone-vale/geometry.json' if vale else 'artifacts/goal-review/silverstone-vale-ga/geometry.json' if vale_ga else 'artifacts/goal-review/silverstone-national-ga/geometry.json')
data=json.loads(path.read_text('utf8'))
roads=unary_union([Polygon(t) for t in data['roads']])
pits=unary_union([Polygon(t) for t in data['pits']])
buildings=unary_union([Polygon(p) for p in data['buildings']])
zone=next(z for z in data['zones'] if z['id']==('ga-farm-curve' if farm_ga else 'vale' if vale else 'ga-vale' if vale_ga else 'ga-national-pit-straight'))
shape=Polygon(zone['boundary']);assert shape.is_valid
issues=[]
targets=[('road',roads),('pit',pits),('building',buildings)]+[(z['id'],Polygon(z['boundary'])) for z in data['zones'] if z['id']!=zone['id']]
for name,target in targets:
 area=shape.intersection(target).area
 if area>1e-6:issues.append({'other':name,'areaMetres2':area})
barrier_checks=[]
for barrier in data['barriers']:
 line=LineString(barrier['coordinates']);footprint=line.buffer((barrier.get('widthMetres') or .06)/2,cap_style=2)
 intersections={name:footprint.intersection(target).area for name,target in [('road',roads),('pit',pits),('standingGround',shape)]}
 if any(a>1e-6 for a in intersections.values()):issues.append({'barrier':barrier['id'],'intersections':intersections})
 barrier_checks.append({'id':barrier['id'],'standingClearanceMetres':line.distance(shape),'intersections':intersections})
assert abs(data['minEyeAboveFloor']-(1.2 if vale else 1.65))<1e-8 and data['maxFloorMeshMismatch']<.001
report={'zoneId':zone['id'],'areaMetres2':shape.area,'samples':data['samples'],'minEyeAboveFloor':data['minEyeAboveFloor'],'minFloorAboveUncutDEM':data['minFloorAboveGround'],'maxFloorMeshMismatch':data['maxFloorMeshMismatch'],'groundNote':('Seating uses the actual native stand mesh.' if vale else 'Standing follows the actual triangulated public-ground mesh. The coarser terrain is cut within this exact source footprint; uncut bilinear DEM differences are reported, not corrected by lifting visitors.'),'barriers':barrier_checks,'issues':issues}
report['maxFloorAboveUncutDEM']=data.get('maxFloorAboveGround')
path.with_name('audit.json').write_text(json.dumps(report,indent=2)+'\n','utf8')
print(json.dumps(report))
if issues:raise ValueError('Unresolved GA/barrier plan intersection')
