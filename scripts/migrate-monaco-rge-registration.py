"""Revalidate the accepted Z geographic footprint after a terrain-only upgrade.
Requires current export-monaco-standing.ts output and the retained preview report.
Does not re-register image pixels, move a boundary, change eyes or fit visibility.
"""
import copy,hashlib,json,math
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
def read(name):return json.loads((ROOT/name).read_text('utf8'))
def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def migrate():
 data=read('src/circuits/generated/monaco.json')
 regional=read('src/circuits/elevation-source/regional-grids/monaco-ign-rge.json')
 proof=read('src/circuits/season-review/monaco-rge-preview-review.json')
 path=ROOT/'src/circuits/europe/monaco-standing-world.json';world=json.loads(path.read_text('utf8'))
 metric=read('artifacts/goal-review/monaco-standing-metric.json')
 inputs={k:data[k] for k in ['trackGeometry','corners','elevation']}
 if metric['inputs']!=inputs:raise ValueError('Re-export actual current road geometry')
 if data['elevation']['grid']!=regional['grid'] or digest(regional['grid'])!=proof['candidateGridSha256']:
  raise ValueError('Terrain differs from tested preview')
 old_inputs={**inputs,'elevation':regional['previousElevation']}
 old_fingerprint=digest(old_inputs);current=next(z for z in data['spectatorZones'] if z['zoneId']=='z-quai-kennedy')
 prior=world.get('terrainMigration',{}).get('previousAcceptedZone',world['zones'][0])
 previous_fp=world.get('terrainMigration',{}).get('previousGeometryFingerprint',world['geometryFingerprint'])
 if old_fingerprint!=previous_fp:raise ValueError('Upgrade must change only terrain; racing geometry/corners changed')
 if current not in [prior,world['zones'][0]]:raise ValueError('Z was edited after accepted registration; preserve it')
 if proof['photographyTests']!=15 or proof['geometryTests']!=26 or set(proof['zones'])!=set(data['spectatorZoneIds']):
  raise ValueError('Preview does not cover all currently available zones')
 origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
 polygon=lambda boundary:Polygon((np.array(boundary)-origin)*factor)
 shape=polygon(prior['boundary']);road=unary_union([Polygon(t) for t in metric['triangles']])
 if not shape.is_valid or shape.intersection(road).area>1e-6:raise ValueError('Z intersects the new rendered road')
 for zone in data['spectatorZones']:
  if zone['zoneId']==current['zoneId']:continue
  for surface in zone.get('surfaces',[]):
   if shape.intersection(polygon(surface['boundary'])).area>1e-6:raise ValueError('Z overlaps '+zone['zoneId'])
 migration=world.get('terrainMigration') or dict(previousGeometryFingerprint=previous_fp,previousAcceptedZone=copy.deepcopy(prior),
  previousMetricFrame=copy.deepcopy(world['metricFrame']),previousSceneAcceptance=copy.deepcopy(world.get('sceneAcceptance')))
 migration.update(checkedAt='2026-10-26',candidateGridSha256=digest(regional['grid']),geographicBoundaryRetained=True,
  method='Retain the previously accepted geographic footprint; recheck actual rendered road/known zones after terrain-only replacement. No new image registration or visibility fitting.')
 world['terrainMigration']=migration;world['previousAcceptedZone']=copy.deepcopy(prior)
 world['geometryFingerprint']=digest(inputs);world['metricFrame']={'origin':metric['origin'],'calibration':metric['calibration']}
 world['mappedAreaMetres2']=shape.area;world['roadClearanceMetres']=shape.distance(road);world['issues']=[]
 zone=copy.deepcopy(prior)
 zone['surfaceSource']['notes']='Ground follows IGN RGE ALTI regional terrain at true scale, with0.04m numerical clearance and1.65m standing eye. API sampled about8x10m; acquisition accuracy varies or is unknown. Not a local slab, bridge, tree or barrier survey.'
 world['zones']=[zone]
 # A new fingerprint cannot inherit old scene acceptance automatically.
 if not world.get('sceneAcceptance',{}).get('geometryFingerprint')==world['geometryFingerprint']:
  world['sceneAcceptance']={'accepted':False,'reason':'Terrain migration verified; repeat final scene regression.'}
 path.write_text(json.dumps(world,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('Retained Z geographic footprint. Area/road clearance:',round(shape.area,2),round(shape.distance(road),3))

if __name__=='__main__':migrate()
