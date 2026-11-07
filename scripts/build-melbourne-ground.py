"""Extract factual mound outlines from the archived official 2026 vector map.
Requires retained visitor-map.pdf and fresh export-spectator-audit.ts asia output.
No organiser artwork is distributed. PDF points are not surveyed coordinates.
"""
import json,math,hashlib
from pathlib import Path
import fitz,numpy as np
from scipy.spatial import Delaunay
from shapely.geometry import Polygon,LineString,box
from shapely.ops import unary_union,polygonize
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
raw=ROOT/'research/season-review/melbourne2026/visitor-map.pdf'
sha=hashlib.sha256(raw.read_bytes()).hexdigest()
if sha!='737e51a321b548123485a32e68ce7c4c2978ba378cbf170cb7593b144f274c41':raise ValueError('Source changed')
document=fitz.open(raw);drawings=document[0].get_drawings(extended=True)
data=read('src/circuits/generated/melbourne.json')
metric=next(x for x in read('artifacts/asia-spectators/metric-geometry.json') if x['id']=='melbourne')
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
# Centerline apexes in PDF points, independently of viewing mound boundaries.
controls={1:[415,647],2:[370,603],3:[136,562],4:[160,521],5:[100,448],6:[152,272],7:[205,260],8:[277,230],9:[628,472],10:[665,424],11:[928,501],12:[881,590],13:[777,585],14:[766,644]}
pixels=np.array(list(controls.values()),float)
world=(np.array([next(c['coordinate'] for c in data['corners'] if c['number']==n) for n in controls])-origin)*factor
fit=np.linalg.lstsq(np.c_[pixels,np.ones(len(pixels))],world,rcond=None)[0]
errors=np.linalg.norm(np.c_[pixels,np.ones(len(pixels))]@fit-world,axis=1)
pad=np.array([[0,80],[1190,80],[1190,740],[0,740]])
points=np.r_[pixels,pad];values=np.r_[world,np.c_[pad,np.ones(4)]@fit];tri=Delaunay(points)
jac=[float(np.linalg.det(np.c_[values[t],np.ones(3)])/np.linalg.det(np.c_[points[t],np.ones(3)])) for t in tri.simplices]
if min(jac)*max(jac)<=0:raise ValueError('Folded registration')
def register(p):
 i=int(tri.find_simplex(p))
 if i<0:raise ValueError('Outside source envelope')
 ids=tri.simplices[i];return np.r_[p,1]@np.linalg.solve(np.c_[points[ids],np.ones(3)],values[ids])
def cubic_outline(drawing,closed=True):
 outline=[]
 for kind,*ps in drawing['items']:
  if kind!='c':raise ValueError('Review new path operator')
  a,b,c,d=map(lambda p:np.array(p),ps)
  for t in np.linspace(0,1,25,endpoint=False):outline.append(((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d).tolist())
 outline.append(outline[0] if closed else list(drawing['items'][-1][-1]));return outline
# Independent water exclusion from the same dated plan; runtime has no lake
# polygon here, so do not assume that an absent water layer means dry ground.
lakeOutline=cubic_outline(document[0].get_drawings()[210])
lakeRing=[register(p).tolist() for p in lakeOutline]
def winding(point,ring):
 x,y=point;value=0
 for a,b in zip(ring,ring[1:]):
  cross=(b[0]-a[0])*(y-a[1])-(x-a[0])*(b[1]-a[1])
  if a[1]<=y<b[1] and cross>0:value+=1
  elif b[1]<=y<a[1] and cross<0:value-=1
 return value
# The authored lake path crosses itself near a shoreline notch. Reproduce its
# PDF nonzero fill rule; never repair it by arbitrary buffering or its convex hull.
sourceLake=unary_union([p for p in polygonize(unary_union(LineString(lakeRing))) if winding(p.representative_point().coords[0],lakeRing)!=0])
if sourceLake.is_empty or not sourceLake.is_valid:raise ValueError('Invalid source lake fill')
objects=[]
objects.append(sourceLake)
for z in data['spectatorZones']:
 if z['zoneId'].startswith('park-pass-'):continue
 for s in z.get('surfaces',[]):objects.append(Polygon((np.array(s['boundary'])-origin)*factor))
for b in data.get('facilities',{}).get('buildings',[]):objects.append(Polygon((np.array(b['boundary'])-origin)*factor))
for lane in data.get('facilities',{}).get('pitLanes',[]):
 if not lane.get('underground'):objects.append(LineString((np.array(lane['coordinates'])-origin)*factor).buffer(lane['widthMetres']/2))
for w in data.get('water',{}).get('features',[]):
 rings=[(np.array(r)-origin)*factor for r in w['rings']]
 objects.append(Polygon(rings[0],rings[1:]))
road=unary_union([Polygon(t) for t in metric['triangles']])
occupied=unary_union([road.buffer(.75),unary_union(objects).buffer(.5)])
url='https://www.grandprix.com.au/uploads/images/F126_009_Visitor-Map_A3_V9-Digi-3.pdf'
archive='https://web.archive.org/web/20260304152734id_/'+url
groups=[('park-pass-t8','Park Pass · T8–T9 草坡',5154,8),('park-pass-t9','Park Pass · T9 草坡',5605,9),('park-pass-t12','Park Pass · T12 草坡',6506,12),('park-pass-t2','Park Pass · T2 草坡',7858,2),('park-pass-lakeside','Park Pass · 湖侧草坡',7407,10)]
zones=[];facts=[]
for zoneId,name,index,corner in groups:
 drawing=drawings[index]
 if drawing['type']!='clip':raise ValueError('Source clip changed')
 stroke=None;centerline=None
 if index==7407:
  # The content stream actually paints this /P4-patterned path with S, not f.
  # Use its authored2.432-point width, butt caps and miter joins. Closing the
  # centerline into a polygon would create a large false triangular viewing area.
  content=document.xref_stream(455)
  if b'2.432 w 10 M 0 j' not in content or b'534.2202 363.2646 cm' not in content:raise ValueError('Review source stroke operators')
  centerline=cubic_outline(drawing,False)
  shape=LineString(centerline).buffer(2.432/2,cap_style=2,join_style=2,mitre_limit=10)
  outline=[list(p) for p in shape.exterior.coords]
  stroke=dict(widthPoints=2.432,lineCap='butt',lineJoin='miter',miterLimit=10,contentXref=455,contentSha256=hashlib.sha256(content).hexdigest(),paintOperator='S',pattern='P4')
 else:outline=cubic_outline(drawing)
 source=Polygon([register(p) for p in outline])
 if not source.is_valid:raise ValueError(f'Invalid source outline {zoneId}')
 usable=source.difference(occupied);parts=[]
 for x in range(math.floor(usable.bounds[0]/80),math.ceil(usable.bounds[2]/80)):
  for y in range(math.floor(usable.bounds[1]/80),math.ceil(usable.bounds[3]/80)):
   area=usable.intersection(box(x*80,y*80,(x+1)*80,(y+1)*80))
   for p in getattr(area,'geoms',[area]):
    if p.geom_type=='Polygon' and p.area>=4:
     if p.interiors:raise ValueError('Partition source holes')
     parts.append((origin+np.array(p.simplify(.05,preserve_topology=True).exterior.coords)/factor).tolist())
 if not parts:raise ValueError('No usable mound footprint')
 surfaces=[dict(surfaceId=f'{zoneId}-{i+1}',boundary=p,baseHeight=.04,rise=0,eyeHeight=1.65,rows=0,terrainFollow=True,frontReference=next(c['coordinate'] for c in data['corners'] if c['number']==corner)) for i,p in enumerate(parts)]
 zones.append(dict(zoneId=zoneId,name=name,kind='general-admission',availability='preparing',boundary=parts[0],surface=dict(baseHeight=.04,rise=0,depth=0,eyeHeight=1.65),surfaces=surfaces,
  source=dict(url=url,checkedAt='2026-10-25',method='estimated',confidence='low',notes='Official2026 vector viewing-mound outlines recovered from a March4 archive. Schematic corner registration, not surveyed boundaries or a mound cross-section. Source-ground follows existing DEM; constructed terraces are not certified. Known road+0.75m and structure+0.5m exclusions; computational tiles are not separate ticket products.'),
  openingSource=dict(url=archive,checkedAt='2026-10-25',method='published',confidence='high',notes='2026 visitor map explicitly distinguishes viewing mounds from grandstands, hospitality, restricted areas and precinct colours.'),
  surfaceSource=dict(url=data['elevation']['source']['url'],checkedAt='2026-10-25',method='estimated',confidence='low',notes='Existing regional ground interpolation; no independently measured constructed mound or terrace profile. The0.04m rendering clearance is an estimate, not hill height. Standing eye is1.65m above this same surface.'),
  geometryReview=dict(checkedAt='2026-10-25',method='Source-derived candidate only; no arbitrary mound height or full park GA access inferred.',issues=['Candidate requires physical and browser review; detailed mound elevation is not independently surveyed.'])))
 facts.append(dict(zoneId=zoneId,pdfClipIndex=index,pdfOutline=outline,sourceAreaMetres2=source.area,usableAreaMetres2=usable.area,excludedAreaMetres2=source.area-usable.area,patchCount=len(parts),**(dict(pdfCenterline=centerline,pdfStroke=stroke) if stroke else {})))
record=dict(circuitId='melbourne',season=2026,checkedAt='2026-10-25',sourceUrl=url,archiveUrl=archive,archiveTimestamp='20260304152734',sourceSha256=sha,archiveSha1='RVQKIRTHOR3XN5VW54Z6CIEUHBK7GEZF',sourcePagePoints=[1190.550048828125,841.8900146484375],registration=dict(controls=controls,globalAffineRmsMetres=float(np.sqrt(np.mean(errors**2))),residualsMetres=errors.tolist(),jacobianRange=[min(jac),max(jac)],limitation='Internal corner interpolation is not independent positional accuracy; mapped boundaries may differ by tens of metres.'),areas=facts,zones=zones,inventoryComplete=False,scope='Five map-defined mound footprints: four closed fill paths and the lakeside patterned stroke at its authored2.432-point width. Not all Park Pass circulation or all public viewing rights; not a surveyed mound profile.')
# Preserve completed review only when the exact source and resulting surface
# coordinates match. Any geometry change resets that individual area to review.
previousPath=ROOT/'src/circuits/asia/melbourne-ground.json'
if previousPath.exists():
 previous=read('src/circuits/asia/melbourne-ground.json')
 if previous.get('sourceSha256')==sha:
  prior={z['zoneId']:z for z in previous['zones']}
  for zone in zones:
   old=prior.get(zone['zoneId'])
   if old and old['surfaces']==zone['surfaces'] and old['source']==zone['source'] and old['surfaceSource']==zone['surfaceSource']:
    zone['availability']=old['availability'];zone['geometryReview']=old['geometryReview']
  if set(prior)=={z['zoneId'] for z in zones} and all(prior[z['zoneId']]==z for z in zones) and previous.get('sceneAcceptance'):
   record['sceneAcceptance']=previous['sceneAcceptance']
(ROOT/'src/circuits/asia/melbourne-ground.json').write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print('Mounds',len(zones),'patches',sum(f['patchCount'] for f in facts),'RMS',round(record['registration']['globalAffineRmsMetres'],2))
print([(f['zoneId'],round(f['usableAreaMetres2'])) for f in facts])
