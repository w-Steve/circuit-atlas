"""Trace eight COTA-published GA patches; exclude independently timed concert land.
Uses only COTA static graphics and existing GIS, never restricted PAM coordinates.
"""
import hashlib,json,math
from pathlib import Path
import cv2,fitz,numpy as np
from scipy.spatial import Delaunay
from shapely.geometry import Polygon,Point,LineString
from shapely.ops import unary_union,nearest_points
ROOT=Path(__file__).resolve().parents[1]
read=lambda name:json.loads((ROOT/name).read_text('utf8'))
digest=lambda value:hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()
research=ROOT/'research/season-review/austin2026'
image_path=research/'seating-ga-map.jpg';pdf_path=research/'2026-ga-ticket-map.pdf'
if hashlib.sha256(image_path.read_bytes()).hexdigest()!='114986e9622fa214fc754666a2cf4d4ca5a2124fe62381829943e6a7696e657a':raise ValueError('COTA source image changed')
if hashlib.sha256(pdf_path.read_bytes()).hexdigest()!='d0b0dec41b783446b938d38a9de6a470ba160a2aaa7799eb08c4e7ed6b1ac0f7':raise ValueError('Annual ticket map changed')
image=cv2.imread(str(image_path));pdf=fitz.open(pdf_path);embedded=pdf.extract_image(pdf[0].get_images()[0][0])['image']
if hashlib.sha256(embedded).hexdigest()!='c40b828ed16001b778b4b70ba9a75ade3e9080e83f2e02bffad666597c921cdb':raise ValueError('Ticket map imagery changed')
ticket=cv2.imdecode(np.frombuffer(embedded,np.uint8),cv2.IMREAD_COLOR)
green=lambda im:cv2.inRange(cv2.cvtColor(im,cv2.COLOR_BGR2HSV),np.array([35,65,55]),np.array([90,255,255]))
contours=lambda mask:[c for c in cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0] if cv2.contourArea(c)>200]
patches=sorted(contours(green(image)),key=lambda c:cv2.boundingRect(c)[:2]);stage=contours(green(ticket))
if len(patches)!=8 or len(stage)!=1:raise ValueError('Review source color classes before tracing')
stage_poly=Polygon(cv2.approxPolyDP(stage[0],1.2,True)[:,0,:])
# Explicit source-number identity, projected to the source road's medial pixels
# before checking any target road/stand clearance. Original labels are offset.
road_pixels=np.array([[789,831],[751,723],[917,621],[945,582],[994,564],[1058,485],[1199,503],[1296,451],[1346,477],[1498,455],[1676,297],[801,413],[888,506],[834,516],[718,458],[789,563],[735,616],[638,618],[512,517],[306,580]],float)
marker_pixels=np.array([[809.07,851.74],[779.02,727.13],[932.83,637.2],[957.29,601.07],[983.51,542.01],[1072.79,503.5],[1203.14,525.12],[1296.33,473.15],[1345.24,496.83],[1507.14,475],[1694.98,276.98],[774.81,402.03],[910.96,515.37],[834.5,492.39],[694.16,444.78],[813.86,568.08],[741.89,638.57],[632.02,638.57],[519.15,498.38],[282.5,575.5]])
# Verify that the independently year-labeled ticket map uses the same artwork.
hsv=cv2.cvtColor(ticket,cv2.COLOR_BGR2HSV);red=cv2.inRange(hsv,np.array([0,125,140]),np.array([10,255,255]))|cv2.inRange(hsv,np.array([170,125,140]),np.array([180,255,255]));red_centers=[]
for c in contours(red):
 x,y,w,h=cv2.boundingRect(c)
 if 13<w<34 and 13<h<34 and .8<w/h<1.2:red_centers.append([x+w/2,y+h/2])
# T20 has a small disconnected red component; retain it for artwork verification.
for c in cv2.findContours(red,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]:
 x,y,w,h=cv2.boundingRect(c)
 if 100<cv2.contourArea(c)<=200 and 13<w<34 and 13<h<34 and .8<w/h<1.2:red_centers.append([x+w/2,y+h/2])
alignment=np.linalg.norm(marker_pixels[:,None,:]-np.array(red_centers)[None,:,:],axis=2).min(axis=1)
if max(alignment)>1:raise ValueError('Do not combine differently aligned map artwork')
data=read('src/circuits/generated/austin.json');metric=read('artifacts/goal-review/austin-ground-metric.json')
if metric['inputs']!={k:data[k] for k in ['trackGeometry','corners','elevation']}:raise ValueError('Re-export current Austin road geometry')
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
world=(np.array([next(c['coordinate'] for c in data['corners'] if c['number']==i) for i in range(1,21)])-origin)*factor
fit=np.linalg.lstsq(np.c_[road_pixels,np.ones(20)],world,rcond=None)[0];rms=float(np.sqrt(np.mean(np.linalg.norm(np.c_[road_pixels,np.ones(20)]@fit-world,axis=1)**2)))
pad=np.array([[-100,-100],[2020,-100],[2020,1180],[-100,1180]]);points=np.r_[road_pixels,pad];values=np.r_[world,np.c_[pad,np.ones(4)]@fit];tri=Delaunay(points)
for ids in tri.simplices:
 if np.linalg.det(np.c_[points[ids],np.ones(3)])*np.linalg.det(np.c_[values[ids],np.ones(3)])<=0:raise ValueError('Folded bounded registration')
registration_edges={tuple(sorted((int(a),int(b)))) for ids in tri.simplices for a,b in zip(ids,np.roll(ids,-1))}
def register(p):
 i=int(tri.find_simplex(p))
 if i<0:raise ValueError('Outside bounded schematic registration')
 ids=tri.simplices[i];a=np.c_[points[ids],np.ones(3)];b=np.c_[values[ids],np.ones(3)]
 if np.linalg.det(a)*np.linalg.det(b)<=0:raise ValueError('Folded registration triangle')
 return np.r_[p,1]@np.linalg.solve(a,values[ids])
def mapped_boundary(ring):
 # Split at affine-cell edges so a long source segment cannot skip a warp bend.
 cross=lambda a,b:a[0]*b[1]-a[1]*b[0]
 result=[]
 for a,b in zip(ring,ring[1:]):
  a=np.array(a);delta=np.array(b)-a;cuts=[0.]
  for i,j in registration_edges:
   edge=points[j]-points[i];den=cross(delta,edge)
   if abs(den)<1e-10:continue
   t=cross(points[i]-a,edge)/den;u=cross(points[i]-a,delta)/den
   if 1e-9<t<1-1e-9 and -1e-9<=u<=1+1e-9:cuts.append(float(t))
  for t in sorted(set(round(t,12) for t in cuts)):result.append(register(a+delta*t))
 result.append(result[0]);return result
geo=lambda p:(origin+np.array(p)/factor).tolist()
poly=lambda boundary:Polygon((np.array(boundary)-origin)*factor)
road=unary_union([Polygon(t) for t in metric['triangles']]);road_center=LineString([(p[0],p[2]) for p in metric['road']]);zones=[];areas=[];region_shapes=[]
names=[('t18-t19','T18–T19'),('t1','T1'),('t16','T16'),('t1-t2','T1–T2'),('t2-t3','T2–T3'),('t5-t7','T5–T7'),('t6-t8','T6–T8'),('t10-t11','T10–T11')]
source_url='https://circuitoftheamericas.com/wp-content/uploads/2026-COTA-Map_Seating_GA.jpg'
source=lambda method,notes:dict(url=source_url,checkedAt='2026-10-26',method=method,confidence='low' if method=='estimated' else 'medium',notes=notes)
for contour,(suffix,label) in zip(patches,names):
 raw=Polygon(cv2.approxPolyDP(contour,1.2,True)[:,0,:]);excluded=raw.intersection(stage_poly);allowed=raw.difference(stage_poly)
 parts=[allowed] if allowed.geom_type=='Polygon' else list(allowed.geoms)
 if any(p.interiors for p in parts):raise ValueError('Retain source holes via a reviewed surface partition')
 surfaces=[];issues=[];shapes=[]
 for j,part in enumerate(parts,1):
  mapped=mapped_boundary(list(part.exterior.coords));shape=Polygon(mapped);shapes.append(shape)
  if not shape.is_valid:raise ValueError('Invalid mapped source outline')
  if shape.intersection(road).area>1e-6:issues.append('Source GA intersects current rendered road')
  for z in data['spectatorZones']:
   if z['zoneId'].startswith('ga-'):continue
   for s in z.get('surfaces',[]):
    if shape.intersection(poly(s['boundary'])).area>1e-6:issues.append('Source GA overlaps '+z['zoneId'])
  reference=nearest_points(Point(np.mean(mapped[:-1],axis=0)),road_center)[1]
  surfaces.append(dict(surfaceId='ga-'+suffix+'-'+str(j),boundary=[geo(p) for p in mapped],baseHeight=.04,rise=0,eyeHeight=1.65,rows=0,terrainFollow=True,frontReference=geo([reference.x,reference.y])))
 shape=unary_union(shapes);default=shape.representative_point();zoneId='ga-'+suffix
 zone=dict(zoneId=zoneId,name=label+' 草地',kind='general-admission',availability='preparing',boundary=surfaces[0]['boundary'],surface=dict(baseHeight=.04,rise=0,depth=0,eyeHeight=1.65),surfaces=surfaces,
  source=source('estimated','COTA-published green GA outline,1.2px boundary simplification;20 named-turn source road controls and bounded affine padding. About17m global affine residual is not surveyed accuracy. No translation/trimming to pass road or visibility checks.'),
  openingSource=source('published','Official GA asset named2026; server reports Last-Modified2026-01-27. Corroborated by year-labeled2026 official fan guide and2026 ticket map. Current linking sales page has already changed to2027, whose prices/terms were not reused.'),
  surfaceSource=source('estimated','Standing on the existing sourced regional DEM with0.04m numerical clearance and1.65m eye; no invented hill profile or viewing-height adjustment.'),
  defaultViewpoint=dict(surfaceId=surfaces[0]['surfaceId'],coordinate=geo([default.x,default.y]),source=source('estimated','Deterministic interior representative point, selected without visibility testing.')),
  geometryReview=dict(checkedAt='2026-10-26',issues=issues or ['Awaiting standing mesh and three-viewport scene review.'],method='Source GA footprint and independently timed concert exclusion; no clearance/visibility-driven relocation.'))
 if excluded.area>0:zone['admissionNote']='仅模拟比赛时开放的草地，音乐会草坪不包含在内。'
 zones.append(zone);region_shapes.append(shape);areas.append(dict(zoneId=zoneId,sourcePixelBoundary=list(map(list,raw.exterior.coords)),raceTimePixelBoundaries=[list(map(list,p.exterior.coords)) for p in parts],concertExcludedPixelArea=excluded.area,mappedAreaMetres2=shape.area,roadClearanceMetres=shape.distance(road),issues=issues))
for i,a in enumerate(region_shapes):
 for b in region_shapes[i+1:]:
  if a.intersection(b).area>1e-6:raise ValueError('Registered GA patches overlap')
out=ROOT/'src/circuits/americas/austin-ground-2026.json';previous=json.loads(out.read_text('utf8')) if out.exists() else {}
for z in zones:
 old=next((p for p in previous.get('zones',[]) if p['zoneId']==z['zoneId']),None)
 if old and all(z[k]==old[k] for k in z if k not in ['availability','geometryReview']):z.update(availability=old['availability'],geometryReview=old['geometryReview'])
record=dict(circuitId='austin',season=2026,checkedAt='2026-10-26',sourceUrl=source_url,sourceSha256=hashlib.sha256(image_path.read_bytes()).hexdigest(),serverReportedLastModified='2026-01-27T19:02:33Z',
 annualFanMapUrl='https://circuitoftheamericas.com/wp-content/uploads/2026-USGP-Fan-Guide_r6_B.jpg',annualFanMapSha256='8400861d52c56c7c94a757b386c13993a22a4d90e0707a92749c0e15dc185932',annualTicketMap=read('research/season-review/austin2026/2026-ticket-map-source.json'),
 concertTimeSource='https://circuitoftheamericas.com/event/f1/know-before-you-go/',concertTimeRule='2026 Festival Lawn gates open approximately1.5hours after on-track activity; do not offer it as daytime racing ground.',
 artworkMaximumMarkerDifferencePixels=float(max(alignment)),registration=dict(sourceRoadPixels=road_pixels.tolist(),sourceMarkerPixels=marker_pixels.tolist(),globalAffineRmsMetres=rms,paddingPixels=pad.tolist(),method='20 source medial-road points matched to existing numbered GIS corners; piecewise affine with bounded outer affine padding. Approximate, not survey.'),
 geometryFingerprint=digest({k:data[k] for k in ['trackGeometry','corners','elevation']}),areas=areas,zones=zones,
 excludedSources=[dict(url='https://pam.co/terms/',reason='Clause4(b)(iv) restricts copying/export/extraction for other uses. No PAM coordinates, map features, tiles, POIs or client code are used in this model.')],
 limitation='Eight diagram patches are parts of one GA product, not eight ticket types. Schematic boundary/ground/obstacles remain approximate; no whole-area visibility guarantee. Current2027 sales terms excluded.')
if previous.get('zones')==zones and previous.get('sceneAcceptance'):record['sceneAcceptance']=previous['sceneAcceptance']
out.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
for a in areas:print(a['zoneId'],'area',round(a['mappedAreaMetres2']),'clearance',round(a['roadClearanceMetres'],2),'concert exclusion px2',round(a['concertExcludedPixelArea'],1),'issues',a['issues'])
