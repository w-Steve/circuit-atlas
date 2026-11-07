"""Fresh planar screening against exported runtime road meshes, with package hashes.
Not a survey, 3D clearance proof, admission inventory, or automatic state migration.
Different zones are compared; intentional tiers within one zone are not conflicts.
"""
import hashlib,json,math
from pathlib import Path
from shapely.geometry import Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/goal-review/season-spatial'
read=lambda p:json.loads(p.read_text('utf8'))
rows=[]
for path in sorted(OUT.glob('*.json')):
 if path.stem=='report':continue
 r=read(path)
 if 'triangles' not in r:continue
 raw=(ROOT/f'src/circuits/generated/{r["id"]}.json').read_bytes()
 if hashlib.sha256(raw).hexdigest()!=r['packageSha256']:raise ValueError('Stale export: '+r['id'])
 d=json.loads(raw)
 scene_path=ROOT/f'src/circuits/scenes/{r["id"]}.json'
 scene_raw=scene_path.read_bytes() if scene_path.exists() else None
 scene_hash=hashlib.sha256(scene_raw).hexdigest() if scene_raw else None
 if scene_hash!=r.get('sceneSha256'):raise ValueError('Stale scene export: '+r['id'])
 if scene_raw:
  authored=json.loads(scene_raw)
  overrides={z['zoneId']:z for z in authored['spectatorZones']}
  d['spectatorZones']=[overrides.get(z['zoneId'],z) for z in d['spectatorZones']]
 lon,lat=r['origin'];sx=111320*math.cos(math.radians(lat))*r['calibration'];sz=-111320*r['calibration']
 def polygon(boundary):
  p=Polygon([((x-lon)*sx,(y-lat)*sz) for x,y,*_ in boundary])
  if not p.is_valid:raise ValueError('Invalid region polygon: '+r['id'])
  return p
 road=unary_union([Polygon(t) for t in r['triangles']]);areas=[];road_hits=[];pairs=[]
 for z in d['spectatorZones']:
  shape=unary_union([polygon(s['boundary']) for s in z['surfaces']])
  areas.append((z,shape));hit=shape.intersection(road).area
  if hit>.1:road_hits.append({'zoneId':z['zoneId'],'availability':z['availability'],'planIntersectionM2':round(hit,3)})
 for i,(a,pa) in enumerate(areas):
  for b,pb in areas[i+1:]:
   hit=pa.intersection(pb).area
   if hit>.1:pairs.append({'zoneIds':[a['zoneId'],b['zoneId']],'availability':[a['availability'],b['availability']],'planIntersectionM2':round(hit,3)})
 rows.append({'circuitId':r['id'],'packageSha256':r['packageSha256'],'sceneSha256':scene_hash,'zoneCount':len(areas),'roadCandidates':road_hits,'zonePairCandidates':pairs})
assert len(rows)==23,'Export all venues before audit'
report={'scope':'23 current packages; fresh road triangle and inter-zone footprint planar screening only. Elevation-separated geometry needs 3D verification; no automatic acceptance or rejection. Pit lanes, buildings, fences, internal tiers and annual completeness are outside this check.','thresholdM2':.1,'rows':rows}
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print(f"23 venues, {sum(r['zoneCount'] for r in rows)} zones: {sum(len(r['roadCandidates']) for r in rows)} road and {sum(len(r['zonePairCandidates']) for r in rows)} inter-zone candidates")
for r in rows:
 accepted=[x for x in r['roadCandidates'] if x['availability']=='available']
 both=[x for x in r['zonePairCandidates'] if all(a=='available' for a in x['availability'])]
 if accepted or both:print(r['circuitId'],json.dumps({'availableRoadCandidates':accepted,'availablePairCandidates':both},ensure_ascii=False))
