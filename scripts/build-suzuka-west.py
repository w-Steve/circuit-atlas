"""Interpret west-ticket green ground, keeping blue seats and image artwork out.
Requires retained source PNG/PDF and freshly exported Asia metric road geometry.
The detailed map is undated and currently linked from a 2027 page: use only the
J/L/M/N/O/P families independently named on the dated 2026 promoter release.
G/H/I and Degner access shown on the later page are deliberately not imported.
"""
import json,math,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label
from scipy.spatial import Delaunay
import contourpy
from shapely.geometry import Polygon,LineString,Point,box
from shapely.ops import unary_union,triangulate,nearest_points

ROOT=Path(__file__).resolve().parents[1]
read=lambda path:json.loads((ROOT/path).read_text('utf8'))
raw=ROOT/'research/season-review/suzuka-west-2026'
image=raw/'west-map-live.png';release=raw/'release.pdf'
if hashlib.sha256(image.read_bytes()).hexdigest()!='27d75c0d9fba686e02b3a20a06d4d7f2366d377f7d5eaba875608a8e35158da5':raise ValueError('Detailed source changed: review mask and controls')
if hashlib.sha256(release.read_bytes()).hexdigest()!='10fec6b8327b3e15d60d0dcacb6b688e7c01a0470c4f6142529cf2b4aa90aebb':raise ValueError('2026 source changed')
data=read('src/circuits/generated/suzuka.json');metric=next(x for x in read('artifacts/asia-spectators/metric-geometry.json') if x['id']=='suzuka')
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
# Degner is traversed from the lower-left approach: T8 is the first bend at
# (125,274), T9 the upper corner at (214,193), before the overpass/hairpin.
# Reversing these two creates a fold and is explicitly rejected above.
controls={8:[125,274],9:[214,193],10:[445,333],11:[434,427],13:[837,199],14:[903,120],15:[270,257]}
pixels=np.array(list(controls.values()),dtype=float)
world=(np.array([next(c['coordinate'] for c in data['corners'] if c['number']==n) for n in controls])-origin)*factor
fit=np.linalg.lstsq(np.c_[pixels,np.ones(len(pixels))],world,rcond=None)[0]
errors=np.linalg.norm(np.c_[pixels,np.ones(len(pixels))]@fit-world,axis=1)
pad=np.array([[-100,-100],[1200,-100],[1200,700],[-100,700]])
points=np.r_[pixels,pad];values=np.r_[world,np.c_[pad,np.ones(4)]@fit];tri=Delaunay(points)
jac=[float(np.linalg.det(np.c_[values[t],np.ones(3)])/np.linalg.det(np.c_[points[t],np.ones(3)])) for t in tri.simplices]
if min(jac)<=0:raise ValueError(f'Folded registration; review controls. Residuals {dict(zip(controls,errors.round(1)))}; folded triangles {[t.tolist() for t,j in zip(tri.simplices,jac) if j<=0]}')
def register(p):
 k=int(tri.find_simplex(p))
 if k<0:raise ValueError('Outside source envelope')
 ids=tri.simplices[k];return np.r_[p,1]@np.linalg.solve(np.c_[points[ids],np.ones(3)],values[ids])

im=np.asarray(Image.open(image).convert('RGB'))
mask=(im[:,:,0]>65)&(im[:,:,0]<110)&(im[:,:,1]>150)&(im[:,:,1]<195)&(im[:,:,2]>60)&(im[:,:,2]<110)
labels,count=label(mask)
groups=[('west-j','西区 · J 坡地',[13]),('west-200r','西区 · 200R 地面',[3,5,9,11,12,14]),('west-spoon-inner','西区 · Spoon 内侧',[8,10]),('west-spoon-outer','西区 · Spoon 外侧',[1,2]),('west-straight','西区 · 西直道',[7]),('west-130r','西区 · 130R 地面',[21])]
road=unary_union([Polygon(t) for t in metric['triangles']]);objects=[]
for zone in data['spectatorZones']:
 if zone['zoneId'].startswith('west-'):continue
 for surface in zone.get('surfaces',[]):objects.append(Polygon((np.array(surface['boundary'])-origin)*factor))
for building in data.get('facilities',{}).get('buildings',[]):objects.append(Polygon((np.array(building['boundary'])-origin)*factor))
for lane in data.get('facilities',{}).get('pitLanes',[]):
 if not lane.get('underground'):objects.append(LineString((np.array(lane['coordinates'])-origin)*factor).buffer(lane['widthMetres']/2))
for feature in data.get('water',{}).get('features',[]):objects.append(Polygon((np.array(feature['rings'][0])-origin)*factor))
exclusion=unary_union([road.buffer(.75)]+[p.buffer(.5) for p in objects])
def polygons(shape):
 if shape.geom_type=='Polygon':return [shape]
 return [p for g in getattr(shape,'geoms',[]) for p in polygons(g)]
url='https://www.suzukacircuit.jp/eng/f1/ticket/images/seat/west_seat/img_west_map.png'
release_url='https://www.honda-ml.co.jp/newsrelease/suzuka/2025/08/0828_f1.pdf'
def source(notes,url=url,method='estimated',confidence='low'):return dict(url=url,checkedAt='2026-10-25',method=method,confidence=confidence,notes=notes)
zones=[];areas=[]
road_points=np.array(metric['road']);road_xy=road_points[:,[0,2]]
def turn_index(number):
 q=(np.array(next(c['coordinate'] for c in data['corners'] if c['number']==number))-origin)*factor
 return int(np.argmin(np.sum((road_xy-q)**2,axis=1)))
viewing_turns={'west-j':(11,13),'west-200r':(11,13),'west-spoon-inner':(13,15),'west-spoon-outer':(13,15),'west-straight':(14,15),'west-130r':(15,16)}
for zid,name,ids in groups:
 selected=np.isin(labels,ids);rings=contourpy.contour_generator(z=selected.astype(float)).lines(.5)
 # Even-odd rings preserve blue/white islands within green ground. Treating
 # every contour as a filled polygon would incorrectly admit those islands.
 source_shape=Polygon()
 for ring in rings:
  if len(ring)>3:source_shape=source_shape.symmetric_difference(Polygon(ring).simplify(.6,preserve_topology=True))
 source_shapes=polygons(source_shape)
 mapped=unary_union([Polygon([register(p) for p in shape.exterior.coords],[[register(p) for p in hole.coords] for hole in shape.interiors]) for shape in source_shapes])
 usable=mapped.difference(exclusion);parts=[];omitted=0
 for poly in polygons(usable):
  x0,z0,x1,z1=poly.bounds
  for x in range(math.floor(x0/80),math.ceil(x1/80)):
   for z in range(math.floor(z0/80),math.ceil(z1/80)):
    for part in polygons(poly.intersection(box(x*80,z*80,(x+1)*80,(z+1)*80))):
     pieces=polygons(unary_union([t.intersection(part) for t in triangulate(part)])) if part.interiors else [part]
     if any(p.interiors for p in pieces):
      pieces=[p for t in triangulate(part) for p in polygons(t.intersection(part))]
     for p in pieces:
      if p.area<4:omitted+=p.area;continue
      if p.interiors:raise ValueError('Unpartitioned access hole')
      parts.append(p.simplify(.05,preserve_topology=True))
 surfaces=[dict(surfaceId=f'{zid}-{i+1}',boundary=(origin+np.array(p.exterior.coords)/factor).tolist(),baseHeight=.04,rise=0,eyeHeight=1.65,rows=0,terrainFollow=True) for i,p in enumerate(parts)]
 start,end=map(turn_index,viewing_turns[zid]);branch=road_xy[start:end+1] if end>start else np.r_[road_xy[start:],road_xy[:end+1]]
 for surface,part in zip(surfaces,parts):
  q=np.array([part.centroid.x,part.centroid.y]);point=branch[int(np.argmin(np.sum((branch-q)**2,axis=1)))]
  surface['frontReference']=(origin+point/factor).tolist()
 if not surfaces:raise ValueError('No source ground remains: review conflict instead of moving it')
 largest=max(range(len(parts)),key=lambda i:parts[i].area);entry=parts[largest].representative_point();entry_geo=(origin+np.array([entry.x,entry.y])/factor).tolist()
 zone=dict(zoneId=zid,name=name,kind='general-admission',availability='preparing',boundary=surfaces[0]['boundary'],surface=dict(baseHeight=.04,rise=0,depth=0,eyeHeight=1.65),surfaces=surfaces,
  defaultViewpoint=dict(surfaceId=surfaces[largest]['surfaceId'],coordinate=entry_geo,source=source('Initial point is the interior representative point of the largest source-derived patch, not selected by sightline optimization. User selections remain continuous and take priority.')),
  source=source('Factual green viewing ribbons traced from the organizer detailed west map; blue reserved stands, yellow photographer-only areas, white ground and roads are not interpreted as public grass. Source is undated and linked from a later-season page: only families corroborated by the dated2026 promoter release are used; not an exact2026 access-boundary survey. Approximate seven-turn piecewise-affine registration with global-affine continuation. Excludes actual rendered road+0.75m and retained stands/buildings/pit/water+0.5m. No translations or fabricated patches. Computational80m patches are not ticket subdivisions.'),
  openingSource=source('Promoter release dated2025-08-28 explicitly identifies2026 Japanese GP and distinguishes green West Area J/L/M/N/O/P from blue reserved seats, including newly added temporary M/O/P stands. One West Area ticket, six geographic portions; no2027 G/H/I expansion imported. Not current ticket stock or complete2026 boundary certification.',release_url,'published','high'),
  surfaceSource=source('Unseated ground follows current GSI DEM5A/DEM10B at real vertical scale, subdivided into <=8m triangles;0.04m mesh clearance, standing eye1.65m. No invented rows, flattened hillside or visibility-fitted eye height. Regional ground and inferred catch fences do not reproduce every constructed terrace/retaining wall.','https://maps.gsi.go.jp/development/ichiran.html'),
  geometryReview=dict(checkedAt='2026-10-25',issues=['Source-derived ground requires rendered geometry and photo acceptance before enabling.'],method='Registration and explicit exclusion only; not yet scene acceptance.'))
 zones.append(zone);areas.append(dict(zoneId=zid,components=ids,viewingTrackCorners=viewing_turns[zid],pixelPolygons=[dict(exterior=list(p.exterior.coords),holes=[list(h.coords) for h in p.interiors]) for p in source_shapes],mappedPolygons=[dict(exterior=(origin+np.array(p.exterior.coords)/factor).tolist(),holes=[(origin+np.array(h.coords)/factor).tolist() for h in p.interiors]) for p in polygons(mapped)],sourceAreaSquareMetres=mapped.area,usableSquareMetres=usable.area,excludedSquareMetres=max(0,mapped.area-usable.area),omittedTinySquareMetres=omitted,patches=len(parts)))
 print(zid,'source',round(mapped.area,1),'excluded',round(mapped.area-usable.area,1),'patches',len(parts),flush=True)
record=dict(circuitId='suzuka',season=2026,checkedAt='2026-10-25',inventoryComplete=False,ticketFamily='West Area / 西エリア券',sourceImage=url,sourceImageSha256=hashlib.sha256(image.read_bytes()).hexdigest(),sourceImageSize=list(Image.open(image).size),sourceYearLimitation='Detailed image is undated; live page is2027. Dated2026 promoter map corroborates geographic families, not surveyed unchanged seasonal boundaries. Retain uncertainty and do not import extra G/H/I or Degner admission.',openingEvidence=dict(url=release_url,sha256=hashlib.sha256(release.read_bytes()).hexdigest(),publishedAt='2025-08-28',sourcePage=0),registration=dict(controls=controls,globalAffineMatrix=fit.tolist(),globalAffineResidualsMetres=errors.tolist(),globalAffineRmsMetres=float(np.sqrt(np.mean(errors**2))),minJacobianDeterminant=min(jac),limitation='Internal exact interpolation is not independent geographic accuracy; source diagram and manual controls may produce tens of metres of error.'),areas=areas,zones=zones)
(ROOT/'src/circuits/asia/suzuka-west-ground.json').write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print('Affine RMS',record['registration']['globalAffineRmsMetres'])
