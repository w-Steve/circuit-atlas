"""Recover the named OSM building missed by the grandstand-only query."""
import copy,hashlib,json,math,xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
raw=ROOT/'research/season-review/silverstone-village-a/osm-20261028.xml'
meta=read('research/season-review/silverstone-village-a/osm-20261028.json')
assert meta['status']==200 and hashlib.sha256(raw.read_bytes()).hexdigest()==meta['sha256']
xml=ET.fromstring(raw.read_bytes());nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in xml.findall('node')}
way=next(w for w in xml.findall('way') if w.get('id')=='227342451');tags={t.get('k'):t.get('v') for t in way.findall('tag')}
assert tags=={'building':'yes','name':'Village A'}
boundary=[nodes[n.get('ref')] for n in way.findall('nd')];assert len(boundary)==5 and boundary[0]==boundary[-1]
pdf=ROOT/'research/season-review/silverstone-abbey/2026-map-mirror.pdf'
assert hashlib.sha256(pdf.read_bytes()).hexdigest()=='3516fbf5bdab374c4a4f53b8a975cbd9ea0714408bd11f6be3c198f05f3e336c'
data=read('src/circuits/generated/silverstone.json');metric=read('artifacts/goal-review/silverstone-standing-metric.json')
assert metric['inputs']=={k:data[k] for k in ['trackGeometry','corners','elevation']}
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration'];points=(np.array(boundary)-origin)*factor;shape=Polygon(points);assert shape.is_valid
roads=unary_union([Polygon(t) for t in metric['triangles']]);road=LineString(metric['road']+[metric['road'][0]])
overlap=shape.intersection(roads).area;assert overlap<1e-6
other=[]
for z in data['spectatorZones']:
 if z['zoneId']=='village-a':continue
 for s in z['surfaces']:
  area=shape.intersection(Polygon((np.array(s['boundary'])-origin)*factor)).area
  if area>1e-6:other.append({'zoneId':z['zoneId'],'areaMetres2':area})
assert not other
lengths=[float(np.linalg.norm(b-a)) for a,b in zip(points[:-1],points[1:])]
long=[i for i,l in enumerate(lengths) if l>max(lengths)*.8]
front=min(long,key=lambda i:road.distance(LineString([points[i],points[i+1]]).centroid))
mid=(points[front]+points[front+1])/2;ref=road.interpolate(road.project(Point(mid)))
source={'url':'https://www.openstreetmap.org/way/227342451','checkedAt':'2026-10-28','method':'extracted','confidence':'medium','notes':'Named Village A polygon from current official OSM API. building=yes was missed by the earlier building=grandstand-only query.2026 organizer map separately labels Village A adjacent to Village B. Geographical footprint, not seat/height survey. OSM contributors, ODbL.'}
opening={'url':'https://gpdestinations.com/wp-content/uploads/2026/06/2026-British-GP-Silverstone-Spectator-Map.pdf','checkedAt':'2026-10-28','method':'published','confidence':'medium','notes':'Silverstone-authored2026 spectator map, mirrored PDF title2026_F1_GB_WayfindingMap_Positive_AWVI, explicitly labels Village A. Factual annual identity only; no PDF artwork redistributed.'}
path=ROOT/'src/circuits/europe/silverstone-village-a-2026.json';previous=read(str(path.relative_to(ROOT))) if path.exists() else None
old=previous['oldZone'] if previous else next(z for z in data['spectatorZones'] if z['zoneId']=='village-a')
zone=copy.deepcopy(old);zone.update(boundary=boundary,source=source,boundarySource=source,openingSource=opening,availability='preparing',geometryReview={'checkedAt':'2026-10-28','issues':['Independent physical/facility and three-viewport scene acceptance pending.'],'method':'Exact named OSM footprint and track-facing original long edge; no relocation or clipping.'})
zone['surfaces'][0].update(boundary=boundary,frontReference=(origin+np.array(ref.coords)[0]/factor).tolist(),rowFrontEdge={'coordinates':[boundary[front],boundary[front+1]],'source':{**source,'method':'estimated','notes':'Original long side facing the racing road defines the front. Seat rows/heights remain estimated, not raycast-adjusted.'}})
zone['surface']['depth']=min(lengths)
structure=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
if previous and structure(zone)==structure(previous['zone']):zone['availability']=previous['zone']['availability'];zone['geometryReview']=previous['zone']['geometryReview']
record={'circuitId':'silverstone','season':2026,'sourceOsmWay':227342451,'sourceTags':tags,'sourceBoundary':boundary,'osmSnapshot':meta,'annualMap':{'url':opening['url'],'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'title':'2026_F1_GB_WayfindingMap_Positive_AWVI','page':1},'geometryFingerprint':hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),'frontEdgeIndices':[front,front+1],'roadIntersectionMetres2':overlap,'otherIntersections':other,'oldRoadIntersectionMetres2':Polygon((np.array(old['boundary'])-origin)*factor).intersection(roads).area,'oldZone':old,'zone':zone,'limits':'Original22 rows,11.04m rise,2.2m platform and1.2m seated eye retained as estimates. No measured seating plan or every-point visibility certification.'}
if previous and zone['availability']=='available' and previous.get('sceneAcceptance'):record['sceneAcceptance']=previous['sceneAcceptance']
path.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(f'Village A5 native points; front{front}; old road overlap {record["oldRoadIntersectionMetres2"]:.2f}m2 ->{overlap:.2f}; other{len(other)}; {zone["availability"]}')
