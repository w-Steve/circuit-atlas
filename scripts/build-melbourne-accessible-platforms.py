"""Extract the three2026 trackside accessible platforms, never ordinary GA land.
Raw copyrighted PDFs remain in local research; published facts retain source hashes.
"""
import copy,hashlib,json,math
from pathlib import Path
import fitz,numpy as np
from scipy.spatial import Delaunay
from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union,nearest_points
ROOT=Path(__file__).resolve().parents[1]
read=lambda name:json.loads((ROOT/name).read_text('utf8'))
manifest=read('research/season-review/melbourne2026/park-pass-documents-manifest.json')
evidence=next(r for r in manifest if r['name'].startswith('F126_Accessibility'))
path=ROOT/'research/season-review/melbourne2026'/evidence['name']
if not evidence['digestMatches'] or hashlib.sha256(path.read_bytes()).hexdigest()!=evidence['sha256']:raise ValueError('Unverified2026 source')
access=fitz.open(path);visitor=fitz.open(ROOT/'research/season-review/melbourne2026/visitor-map.pdf')
old=visitor[0].get_drawings()[4109];new=access[0].get_drawings()[4027]
if [x[0] for x in old['items']]!=[x[0] for x in new['items']]:raise ValueError('Road artwork changed')
to_array=lambda d:np.array([list(p) for item in d['items'] for p in item[1:]])
artwork_delta=float(np.abs(to_array(old)-to_array(new)).max())
if artwork_delta>.002:raise ValueError('Do not assume shared artwork without alignment')
data=read('src/circuits/generated/melbourne.json');stands=read('src/circuits/asia/melbourne-stands-2026.json')
metric=next(m for m in read('artifacts/asia-spectators/metric-geometry.json') if m['id']=='melbourne')
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
reg=stands['registration'];keys=list(reg['controls']);pixels=np.array(list(reg['controls'].values()));world=(np.array([next(c['coordinate'] for c in data['corners'] if c['number']==int(n)) for n in keys])-origin)*factor
fit=np.linalg.lstsq(np.c_[pixels,np.ones(len(pixels))],world,rcond=None)[0];pad=np.array([[0,80],[1190,80],[1190,740],[0,740]])
tri=Delaunay(np.r_[pixels,pad]);points=np.r_[np.array([reg['effectiveControls'][n] for n in keys]),pad];values=np.r_[world,np.c_[pad,np.ones(4)]@fit]
def register(p):
 for ids in tri.simplices:
  a=np.c_[points[ids],np.ones(3)];weights=np.r_[p,1]@np.linalg.inv(a)
  if min(weights)>=-1e-9:
   if np.linalg.det(a)*np.linalg.det(np.c_[values[ids],np.ones(3)])<=0:raise ValueError('Folded registration')
   return np.r_[p,1]@np.linalg.solve(a,values[ids])
 raise ValueError('Unsupported map location')
geo=lambda p:(origin+np.array(p)/factor).tolist()
poly=lambda ring:Polygon((np.array(ring)-origin)*factor)
road=unary_union([Polygon(t) for t in metric['triangles']]);center=LineString([(p[0],p[2]) for p in metric['road']])
zones=[];facts=[]
source=lambda method,notes:dict(url=evidence['original'],checkedAt='2026-10-26',method=method,confidence='low' if method=='estimated' else 'high',notes=notes)
for turn,index in [(3,8532),(4,8531),(12,8533)]:
 drawing=access[0].get_drawings()[index]
 if len(drawing['items'])!=4 or any(p[0]!='l' for p in drawing['items']):raise ValueError('Review the platform vector outline')
 pdf=[list(item[1]) for item in drawing['items']];pdf.append(pdf[0]);mapped=[register(p) for p in pdf];shape=Polygon(mapped);boundary=[geo(p) for p in mapped]
 if not shape.is_valid:raise ValueError('Invalid platform footprint')
 target=np.array(nearest_points(shape.centroid,center)[1].coords[0]);edges=[(i,np.linalg.norm(b-a),(a+b)/2) for i,(a,b) in enumerate(zip(mapped,mapped[1:]))];longest=max(e[1] for e in edges);front=min((e for e in edges if e[1]>.7*longest),key=lambda e:np.linalg.norm(e[2]-target));i=front[0]
 issues=[]
 if shape.intersection(road).area>1e-6:issues.append('Platform intersects the rendered racing surface')
 for z in data['spectatorZones']:
  if z['zoneId'].startswith('accessible-platform-'):continue
  for s in z.get('surfaces',[]):
   if shape.intersection(poly(s['boundary'])).area>1e-6:issues.append('Platform overlaps '+z['zoneId'])
 zoneId='accessible-platform-t'+str(turn)
 z=dict(zoneId=zoneId,name='T'+str(turn)+' 无障碍平台',kind='grandstand',availability='preparing',boundary=boundary,
  admissionNote='供有无障碍需求的观众使用，不接受提前预订。',supportToTerrain=True,
  surface=dict(baseHeight=1,rise=0,depth=float(shape.area/longest),eyeHeight=1.2),
  surfaces=[dict(surfaceId=zoneId+'-1',boundary=boundary,baseHeight=1,rise=0,eyeHeight=1.2,rows=1,frontReference=geo(target),rowFrontEdge=dict(coordinates=[boundary[i],boundary[i+1]],source=source('estimated','Long platform face nearest the local racing line; schematic orientation.')),
   groundReference=dict(coordinate=geo(front[2]),source=source('estimated','Front-edge midpoint samples the existing regional DEM, not a surveyed platform foundation.')))],
  source=source('estimated','Exact pink platform outline from verified2026 Accessibility Map. Shared road artwork differs by at most0.002 PDF point; inherited14-turn schematic registration remains approximate.'),
  openingSource=source('published','2026 flyer page2 identifies three trackside accessible viewing platforms at Turns3,4,12 for patrons with accessibility needs, without advance reservation. Not unrestricted ordinary Park Pass grass.'),
  surfaceSource=source('estimated','Flat accessible deck represented as one seated level: provisional1m platform above the regional ground reference,0rise,1.2m seated eye. No measured height, guardrail or ramp geometry; do not fit height to visibility.'),
  geometryReview=dict(checkedAt='2026-10-26',issues=issues or ['Awaiting seated mesh and three-viewport review.'],method='Official accessibility footprint registered using the existing circuit-map transform; no trimming, displacement or visibility fitting.'))
 zones.append(z);facts.append(dict(zoneId=zoneId,turn=turn,pdfDrawingIndex=index,pdfBoundary=pdf,areaMetres2=shape.area,roadClearanceMetres=shape.distance(road),issues=issues))
record=dict(circuitId='melbourne',season=2026,checkedAt='2026-10-26',sourceEvidence=evidence,sharedRoadArtworkMaximumDifferencePdfPoints=artwork_delta,registration='Inherited14-turn piecewise registration from the verified2026 visitor map; not a surveyed geographic boundary.',areas=facts,zones=zones,
 excludedNonTracksidePlatforms=['Melbourne Walk','Main Stage'],limitation='These three accessible facilities do not complete the ordinary Park Pass non-mound boundaries. Deck height and site obstacles are not surveyed.')
out=ROOT/'src/circuits/asia/melbourne-accessible-platforms-2026.json'
if out.exists():
 previous=json.loads(out.read_text('utf8'))
 for z in zones:
  old=next((a for a in previous['zones'] if a['zoneId']==z['zoneId']),None)
  if old and all(old[k]==z[k] for k in z if k not in ['availability','geometryReview']):z.update(availability=old['availability'],geometryReview=old['geometryReview'])
 if previous.get('zones')==zones and previous.get('sceneAcceptance'):record['sceneAcceptance']=previous['sceneAcceptance']
out.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
for f in facts:print(f['zoneId'],'area',round(f['areaMetres2'],1),'road clearance',round(f['roadClearanceMetres'],2),'issues',f['issues'])
