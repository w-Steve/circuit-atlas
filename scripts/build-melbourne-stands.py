"""Build reviewed2026 blue-map stand footprints with explicit estimated profiles.
Requires fresh export-spectator-audit.ts asia output. Never fits heights to photos.
"""
import json,math,hashlib,fitz,sys
from pathlib import Path
import numpy as np
from scipy.spatial import Delaunay
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union,nearest_points
root=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text('utf8'))
data=read('src/circuits/generated/melbourne.json');review=read('src/circuits/asia/melbourne-season-2026.json')
ground=read('src/circuits/asia/melbourne-ground.json')
if ground['sourceSha256']!=review['sourceSha256']:raise ValueError('Source mismatch')
previousPath=root/'src/circuits/asia/melbourne-stands-2026.json'
previous=read('src/circuits/asia/melbourne-stands-2026.json') if previousPath.exists() else {}
if previous.get('curvedRowMigration') and '--audit' not in sys.argv:
 raise ValueError('Accepted curved rows use retained geographic footprints. Use build-melbourne-curved-rows.py; do not rerun image registration to change seating interpolation.')
waiteOriginal=next((z for z in previous.get('replacedZones',[]) if z['zoneId']=='waite'),next(z for z in data['spectatorZones'] if z['zoneId']=='waite'))
hillOriginal=next((z for z in previous.get('replacedZones',[]) if z['zoneId']=='hill'),next(z for z in data['spectatorZones'] if z['zoneId']=='hill'))
amexOriginal=next((z for z in previous.get('replacedZones',[]) if z['zoneId']=='american-express'),next(z for z in data['spectatorZones'] if z['zoneId']=='american-express'))
stewartOriginal=next((z for z in previous.get('replacedZones',[]) if z['zoneId']=='stewart'),next(z for z in data['spectatorZones'] if z['zoneId']=='stewart'))
straightIds=['fangio','piastri','jones','senna','prost','schumacher']
straightOriginals=[next((z for z in previous.get('replacedZones',[]) if z['zoneId']==zoneId),next(z for z in data['spectatorZones'] if z['zoneId']==zoneId)) for zoneId in straightIds]
nextIds=['webber','button','ricciardo','lauda','vettel','clark','brabham']
nextOriginals=[next((z for z in previous.get('replacedZones',[]) if z['zoneId']==zoneId),next(z for z in data['spectatorZones'] if z['zoneId']==zoneId)) for zoneId in nextIds]
raw=root/'research/season-review/melbourne2026/visitor-map.pdf'
if hashlib.sha256(raw.read_bytes()).hexdigest()!=review['sourceSha256']:raise ValueError('PDF changed')
pdf=fitz.open(raw);drawing=pdf[0].get_drawings()[8781]
waiteBoundary=[list(v[1]) for v in drawing['items']];waiteBoundary.append(waiteBoundary[0])
footprints=review['newOfficialFootprints']+[dict(zoneId='waite',name='Waite',sourceDrawingIndex=8781,pdfBoundary=waiteBoundary,nearestOfficialTurn=10)]
hillBoundary=[list(v[1]) for v in pdf[0].get_drawings()[8783]['items']];hillBoundary.append(hillBoundary[0])
footprints.append(dict(zoneId='hill',name='Hill',sourceDrawingIndex=8783,pdfBoundary=hillBoundary,nearestOfficialTurn=3))
amexBoundary=[list(v[1]) for v in pdf[0].get_drawings()[8774]['items']];amexBoundary.append(amexBoundary[0])
footprints.append(dict(zoneId='american-express',name='American Express',sourceDrawingIndex=8774,pdfBoundary=amexBoundary,nearestOfficialTurn=4))
stewartBoundary=[list(v[1]) for v in pdf[0].get_drawings()[8780]['items']];stewartBoundary.append(stewartBoundary[0])
footprints.append(dict(zoneId='stewart',name='Stewart',sourceDrawingIndex=8780,pdfBoundary=stewartBoundary,nearestOfficialTurn=5))
for zoneId,name,index,turn in [('fangio','Fangio',8773,1),('piastri','Piastri',8788,1),('jones','Jones',8789,1),('senna','Senna',8779,14),('prost','Prost',8791,14),('schumacher','Schumacher',8790,13),('webber','Webber',8782,11),('button','Button',8777,8),('ricciardo','Ricciardo',8784,3),('lauda','Lauda',8775,12),('vettel','Vettel',8778,11),('clark','Clark',8776,8),('brabham','Brabham',8787,1)]:
 drawing=pdf[0].get_drawings()[index];outline=[]
 for item in drawing['items']:
  if item[0]=='l':outline.append(list(item[1]))
  elif item[0]=='re':outline=[list(item[1].tl),list(item[1].tr),list(item[1].br),list(item[1].bl)]
  else:raise ValueError('Review blue straight footprint operator')
 outline.append(outline[0]);footprints.append(dict(zoneId=zoneId,name=name,sourceDrawingIndex=index,pdfBoundary=outline,nearestOfficialTurn=turn))
# Two nominally shared Senna/Prost endpoints differ by about0.001 PDF point
# in the authored export. Canonicalize only such drawing-precision joins;
# retain raw facts and maximum displacement instead of trimming an overlap.
entries=[];normalizations=[]
for f in footprints:
 f['rawPdfBoundary']=[p[:] for p in f['pdfBoundary']]
 for i,p in enumerate(f['pdfBoundary'][:-1]):entries.append((f,i,np.array(p)))
parent=list(range(len(entries)))
def rootOf(i):
 while parent[i]!=i:i=parent[i]
 return i
for i,(a,_,p) in enumerate(entries):
 for j,(b,_,q) in enumerate(entries[i+1:],i+1):
  if a['zoneId']!=b['zoneId'] and np.linalg.norm(p-q)<=.0015:parent[rootOf(j)]=rootOf(i)
for group in {rootOf(i) for i in range(len(entries))}:
 ids=[i for i in range(len(entries)) if rootOf(i)==group]
 if len(ids)<2:continue
 center=np.mean([entries[i][2] for i in ids],axis=0)
 normalizations.append(dict(zones=[entries[i][0]['zoneId'] for i in ids],rawPdfPoints=[entries[i][2].tolist() for i in ids],canonicalPdfPoint=center.tolist(),maximumShiftPdfPoints=max(float(np.linalg.norm(entries[i][2]-center)) for i in ids)))
 for i in ids:entries[i][0]['pdfBoundary'][entries[i][1]]=center.tolist()
for f in footprints:f['pdfBoundary'][-1]=f['pdfBoundary'][0][:]
metric=next(m for m in read('artifacts/asia-spectators/metric-geometry.json') if m['id']=='melbourne')
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
controls=ground['registration']['controls'];pixels=np.array(list(controls.values()),float)
world=(np.array([next(c['coordinate'] for c in data['corners'] if c['number']==int(n)) for n in controls])-origin)*factor
fit=np.linalg.lstsq(np.c_[pixels,np.ones(len(pixels))],world,rcond=None)[0]
pad=np.array([[0,80],[1190,80],[1190,740],[0,740]])
points=np.r_[pixels,pad];values=np.r_[world,np.c_[pad,np.ones(4)]@fit];tri=Delaunay(points)
# Refine the offset T4 control against the actual navy track-center stroke.
# Keep the previous padding and triangulation topology, so unrelated map regions
# remain byte-stable. This uses PDF geometry, never road clearance or photos.
trackPoints=[]
for kind,*ps in pdf[0].get_drawings()[4109]['items']:
 if kind=='c':
  a,b,c,d=map(lambda p:np.array(p),ps)
  for t in np.linspace(0,1,201):trackPoints.append(((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d).tolist())
 elif kind=='l':trackPoints.extend([list(ps[0]),list(ps[1])])
 else:raise ValueError('Review source centerline operator')
from shapely.geometry import Point
trackLine=LineString(trackPoints);t4Index=list(controls).index('4');oldT4=points[t4Index].copy()
marker=pdf[0].get_drawings()[5027]['rect'];markerCenter=np.array([(marker.x0+marker.x1)/2,(marker.y0+marker.y1)/2])
corrected=trackLine.interpolate(trackLine.project(Point(markerCenter)));points[t4Index]=corrected.coords[0]
marker8=pdf[0].get_drawings()[5031]['rect'];marker8Center=np.array([(marker8.x0+marker8.x1)/2,(marker8.y0+marker8.y1)/2])
points[list(controls).index('8')]=trackLine.interpolate(trackLine.project(Point(marker8Center))).coords[0]
# The main-straight section is a filled ribbon (4110), not part of the
# center-stroke4109. Recover its T14 mid-curve from the paired outline cubics.
marker1=pdf[0].get_drawings()[5024]['rect'];marker1Center=np.array([(marker1.x0+marker1.x1)/2,(marker1.y0+marker1.y1)/2])
points[list(controls).index('1')]=trackLine.interpolate(trackLine.project(Point(marker1Center))).coords[0]
ribbon=pdf[0].get_drawings()[4110];outer=np.array([list(p) for p in ribbon['items'][0][1:]])
inner=np.array([list(p) for p in reversed(ribbon['items'][12][1:])]);mid=(outer+inner)/2
midPoints=[((1-t)**3*mid[0]+3*(1-t)**2*t*mid[1]+3*(1-t)*t*t*mid[2]+t**3*mid[3]).tolist() for t in np.linspace(0,1,501)]
marker14=pdf[0].get_drawings()[5037]['rect'];marker14Center=np.array([(marker14.x0+marker14.x1)/2,(marker14.y0+marker14.y1)/2])
midLine=LineString(midPoints);points[list(controls).index('14')]=midLine.interpolate(midLine.project(Point(marker14Center))).coords[0]
for ids in tri.simplices:
 if np.linalg.det(np.c_[points[ids],np.ones(3)])*np.linalg.det(np.c_[values[ids],np.ones(3)])<=0:raise ValueError('Local control correction folds map')
def register(p):
 for ids in tri.simplices:
  matrix=np.c_[points[ids],np.ones(3)]
  weights=np.r_[p,1]@np.linalg.inv(matrix)
  if min(weights)>=-1e-9:return np.r_[p,1]@np.linalg.solve(matrix,values[ids])
 raise ValueError('Outside registration envelope')
geo=lambda p:(origin+np.array(p)/factor).tolist()
poly=lambda b:Polygon((np.array(b)-origin)*factor)
if '--audit' in sys.argv:
 drawings=pdf[0].get_drawings();rows=[]
 mapping={'fangio':8773,'american-express':8774,'lauda':8775,'clark':8776,'button':8777,'vettel':8778,'senna':8779,'stewart':8780,'waite':8781,'webber':8782,'hill':8783,'ricciardo':8784,'mercedes-amg':8785,'engineers-australia':8786,'brabham':8787,'piastri':8788,'jones':8789,'schumacher':8790,'prost':8791}
 road=unary_union([Polygon(t) for t in metric['triangles']])
 for zoneId,index in mapping.items():
  outline=[]
  for item in drawings[index]['items']:
   if item[0]=='l':outline.append(list(item[1]))
   elif item[0]=='re':outline=[list(item[1].tl),list(item[1].tr),list(item[1].br),list(item[1].bl)]
   else:raise ValueError('Review blue footprint operator')
  outline.append(outline[0]);shape=Polygon([register(p) for p in outline])
  current=poly(next(z for z in data['spectatorZones'] if z['zoneId']==zoneId)['boundary'])
  rows.append(dict(zoneId=zoneId,pdfDrawingIndex=index,pdfBoundary=outline,mappedBoundary=[geo(p) for p in shape.exterior.coords],centroidOffsetMetres=current.centroid.distance(shape.centroid),sourceRoadIntersectionMetres2=shape.intersection(road).area))
 report=dict(circuitId='melbourne',season=2026,checkedAt='2026-10-25',sourceUrl=review['sourceUrl'],sourceSha256=review['sourceSha256'],generatedSha256=hashlib.sha256((root/'src/circuits/generated/melbourne.json').read_bytes()).hexdigest(),registrationRevision='source-markers-t1-t4-t8-t14',effectiveControls={n:points[i].tolist() for i,n in enumerate(controls)},scope='Current model versus schematic official blue-map footprints, not external survey accuracy. A source footprint colliding with the current road needs registration review, never automatic trimming.',areas=rows)
 (root/'src/circuits/season-review/melbourne-footprint-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
 print('19 official blue footprints audited; largest offsets:',[(r['zoneId'],round(r['centroidOffsetMetres'],1)) for r in sorted(rows,key=lambda r:r['centroidOffsetMetres'],reverse=True)[:3]])
 raise SystemExit(0)
newIds={f['zoneId'] for f in footprints}
old=[(z['zoneId'],poly(s['boundary'])) for z in data['spectatorZones'] if z['zoneId'] not in newIds for s in z.get('surfaces',[])]
objects=[(b['id'],poly(b['boundary'])) for b in data.get('facilities',{}).get('buildings',[])]
lanes=[LineString((np.array(p['coordinates'])-origin)*factor).buffer(p['widthMetres']/2) for p in data.get('facilities',{}).get('pitLanes',[]) if not p.get('underground')]
road=unary_union([Polygon(t) for t in metric['triangles']])
roadCenter=LineString([(p[0],p[2]) for p in metric['road']])
zones=[];facts=[]
def source(method,notes):return dict(url=review['sourceUrl'],checkedAt='2026-10-25',method=method,confidence='low' if method=='estimated' else 'high',notes=notes)
for f in footprints:
 pts=[register(p) for p in f['pdfBoundary']];shape=Polygon(pts)
 if not shape.is_valid:raise ValueError('Invalid mapped footprint')
 boundary=[geo(p) for p in pts];target=next(c['coordinate'] for c in data['corners'] if c['number']==f['nearestOfficialTurn']);ref=(np.array(target)-origin)*factor
 if f['zoneId'] in straightIds+nextIds:
  ref=np.array(nearest_points(shape.centroid,roadCenter)[1].coords[0]);target=geo(ref)
 edges=[(i,np.linalg.norm(b-a),(a+b)/2) for i,(a,b) in enumerate(zip(pts,pts[1:]))]
 longest=max(v[1] for v in edges);front=min((e for e in edges if e[1]>.7*longest),key=lambda e:np.linalg.norm(e[2]-ref));i=front[0]
 axis=(pts[i+1]-pts[i])/front[1];normal=np.array([-axis[1],axis[0]])
 spanDepth=float(np.ptp(np.array(pts)@normal));curved=len(pts)>5
 depth=2*shape.area/shape.length if curved else spanDepth;rows=max(3,round(depth/.85)+1);rise=(rows-1)*.4
 issues=[]
 if shape.intersection(road).area>1e-6:issues.append('Source footprint intersects current road geometry; do not translate or trim automatically.')
 for name,p in old+objects:
  if shape.intersection(p).area>1e-6:issues.append('Source footprint overlaps '+name+'; reconcile sources before enabling.')
 if any(shape.intersection(p).area>1e-6 for p in lanes):issues.append('Source footprint intersects recorded pit lane.')
 profile=source('estimated','Independent cross-section unavailable. Approximate0.85m row pitch,0.4m rise per row,2.2m front platform; row count inferred from schematic map depth, not measured seating. Seated eye1.2m. No photo/sightline fitting.')
 if f['zoneId']=='waite':profile['notes']+=' The previous30row/14.88m profile is retained in replacedZones, not forced onto the corrected15.996m footprint depth.'
 if curved:profile['notes']+=' Curved footprint uses2*area/perimeter as a schematic mean strip depth, not the full bent-outline span. No surveyed row count implied.'
 surface=dict(surfaceId=f['zoneId']+'-1',boundary=boundary,baseHeight=2.2,rise=rise,eyeHeight=1.2,rows=rows,frontReference=target,
  rowFrontEdge=dict(coordinates=[boundary[i],boundary[i+1]],source=source('extracted','Long source footprint edge facing the named turn; not a surveyed seat-row bearing.')),
  groundReference=dict(coordinate=geo(front[2]),source=source('estimated','Front-edge midpoint samples the retained regional DEM; not a surveyed foundation.')))
 if f['zoneId'] in straightIds+nextIds:surface['rowFrontEdge']['source']['notes']='Long source edge facing the nearby actual racing centerline. The named turn is identity, not a distant camera anchor; no visibility or photo fitting.'
 if curved:surface['rowBearing']='local-normal'
 z=dict(zoneId=f['zoneId'],name=f['name'],kind='grandstand',availability='preparing',supportToTerrain=True,boundary=boundary,surface=dict(baseHeight=2.2,rise=rise,depth=depth,eyeHeight=1.2),surfaces=[surface],
  source=source('estimated','Exact blue footprint from dated2026 official PDF, registered with the existing14-corner map transform. Internal affineRMS22.50m is not external accuracy; positional uncertainty remains tens of metres.'),
  openingSource=source('published','Named blue grandstand on verified2026 visitor map; separate from hospitality and from historical Moss.'),surfaceSource=profile,
  geometryReview=dict(checkedAt='2026-10-25',issues=issues or ['Awaiting shared-model mesh and browser acceptance at explicitly approximate profile precision.'],method='Source geometry retained without translation, shrinkage or visibility-driven height changes.'))
 zones.append(z);facts.append(dict(zoneId=z['zoneId'],pdfDrawingIndex=f['sourceDrawingIndex'],sourcePdfBoundary=f['rawPdfBoundary'],registeredPdfBoundary=f['pdfBoundary'],mappedAreaMetres2=shape.area,frontEdgeIndex=i,depthMetres=depth,spanDepthMetres=spanDepth,profileDepthMethod='2*area/perimeter for a curved strip' if curved else 'perpendicular footprint span',estimatedRows=rows,estimatedRiseMetres=rise,roadClearanceMetres=shape.distance(road),planarIssues=issues))
for i,a in enumerate(zones):
 for b in zones[i+1:]:
  overlap=poly(a['boundary']).intersection(poly(b['boundary'])).area
  if overlap>1e-6:raise ValueError(f'Official footprints overlap after registration: {a["zoneId"]}/{b["zoneId"]} {overlap:.6f}m2; review source paths')
record=dict(circuitId='melbourne',season=2026,checkedAt='2026-10-25',sourceUrl=review['sourceUrl'],sourceSha256=review['sourceSha256'],registration=ground['registration'],areas=facts,zones=zones,replacedZones=[waiteOriginal,hillOriginal,amexOriginal,stewartOriginal]+straightOriginals+nextOriginals,limitation='Map-derived approximate stand profiles, not certified as-built structures or exact numbered seats. A clear default photo cannot validate every viewpoint.')
record['waiteMigration']=dict(previousOverlapWithAmgMetres2=poly(waiteOriginal['boundary']).intersection(poly(zones[1]['boundary'])).area,newOverlapWithAmgMetres2=poly(zones[2]['boundary']).intersection(poly(zones[1]['boundary'])).area,reason='Old third-party schematic footprint conflicts with separately labeled official2026 blue areas. Migrate Waite to its own official footprint, not translate or shrink Mercedes-AMG.',previousProfileRetainedIn='replacedZones')
record['registration']={**ground['registration'],'localT4Correction':dict(previousPdfPoint=oldT4.tolist(),markerPdfPoint=markerCenter.tolist(),markerDrawingIndex=5027,correctedPdfPoint=points[t4Index].tolist(),sourceDrawingIndex=4109,sourceStrokeWidthPoints=5.409999847412109,method='Project the authored yellow T4 marker center onto the authored navy source track-center stroke. Previous triangulation topology and padding retained; no target clearance or photo fitting.',pixelDistance=float(np.linalg.norm(points[t4Index]-oldT4)))}
record['registration']['localT8Correction']=dict(markerDrawingIndex=5031,markerPdfPoint=marker8Center.tolist(),previousPdfPoint=controls['8'],correctedPdfPoint=points[list(controls).index('8')].tolist(),sourceDrawingIndex=4109,method='Authored yellow T8 marker projected onto the navy center stroke; original topology/padding retained, no target clearance fitting.')
record['registration']['effectiveControls']={n:points[i].tolist() for i,n in enumerate(controls)}
record['registration']['startStraightCorrection']=dict(marker1DrawingIndex=5024,marker1PdfPoint=marker1Center.tolist(),correctedT1PdfPoint=points[list(controls).index('1')].tolist(),marker14DrawingIndex=5037,marker14PdfPoint=marker14Center.tolist(),correctedT14PdfPoint=points[list(controls).index('14')].tolist(),ribbonDrawingIndex=4110,pairedCurveItems=[0,12],midCurveControls=mid.tolist(),method='T1 marker projected onto source center stroke; T14 marker projected onto the mid-curve of its paired source ribbon boundaries. No target-road clearance or photo fitting; baseline padding and mesh topology retained.')
record['hillMigration']=dict(previousFailure=hillOriginal['geometryReview']['issues'],oldAmexOverlapWithOfficialHillMetres2=poly(amexOriginal['boundary']).intersection(poly(zones[3]['boundary'])).area,newAmexOverlapWithHillMetres2=poly(zones[4]['boundary']).intersection(poly(zones[3]['boundary'])).area,reason='Old Hill reported no road across either seating face. Its official footprint exposed the old Amex mismatch; source T4 marker/centerline registration was corrected before accepting the two independent blue footprints.')
record['stewartMigration']=dict(previousCentroidOffsetMetres=poly(stewartOriginal['boundary']).centroid.distance(poly(zones[5]['boundary']).centroid),reason='Replace the displaced old schematic footprint with its own official2026 blue outline; preserve the old object, not a guessed translation.')
record['sharedVertexNormalizations']=normalizations
record['t8Migration']=dict(previousAcceptedZones=previous.get('t8Migration',{}).get('previousAcceptedZones',[next(z for z in data['spectatorZones'] if z['zoneId']==id) for id in ['engineers-australia','mercedes-amg','waite']]),reason='Source T8 marker refinement also changes neighboring registered triangles. Preserve their accepted pre-refinement objects and require fresh mesh/browser review.')
p=root/'src/circuits/asia/melbourne-stands-2026.json'
if p.exists():
 previous=json.loads(p.read_text('utf8'))
 if previous.get('sourceSha256')==record['sourceSha256']:
  prior={z['zoneId']:z for z in previous['zones']}
  for z in zones:
   old=prior.get(z['zoneId'])
   if old and all(old[k]==z[k] for k in z if k not in ['availability','geometryReview']):z['availability']=old['availability'];z['geometryReview']=old['geometryReview']
  if previous['zones']==zones and previous.get('sceneAcceptance'):record['sceneAcceptance']=previous['sceneAcceptance']
p.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(json.dumps(facts,ensure_ascii=False))
