"""Register Z against the actual two road branches; never extrapolate Rocher.
Requires export-monaco-standing.ts metric export from the current package.
No visibility fitting, footprint shrinking, road subtraction or height fitting.
"""
import ast,hashlib,json,math
from pathlib import Path
import fitz,numpy as np
from scipy.spatial import Delaunay
from shapely.geometry import Polygon,Point,LineString
from shapely.ops import unary_union
root=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text('utf8'))
existing=root/'src/circuits/europe/monaco-standing-world.json'
if existing.exists() and json.loads(existing.read_text('utf8')).get('terrainMigration'):
 raise ValueError('Z has an accepted geographic footprint retained across terrain upgrades. Use migrate-monaco-rge-registration.py to revalidate it; do not re-register source artwork against a new DEM.')
source=read('src/circuits/europe/monaco-standing-2026.json');alignment=read('src/circuits/europe/monaco-map-alignment.json')
viewRoad=read('src/circuits/europe/monaco-standing-view-road.json')
if source['areas'][0]['productId']!='z':raise ValueError('Standing product order changed')
data=read('src/circuits/generated/monaco.json');metric=read('artifacts/goal-review/monaco-standing-metric.json')
if metric['inputs']!={k:data[k] for k in ['trackGeometry','corners','elevation']}:raise ValueError('Stale rendered metric export; export current geometry first')
pdf=root/'research/europe/monaco-official.pdf'
if hashlib.sha256(pdf.read_bytes()).hexdigest()!=alignment['basisPdfSha256']:raise ValueError('Basis PDF changed')
a=np.array(alignment['basisPixels']);b=np.array(alignment['publicPixels'])
matrix=np.array([[x,-y,1,0] for x,y in a]+[[y,x,0,1] for x,y in a])
scale,rotation,dx,dy=np.linalg.lstsq(matrix,np.r_[b[:,0],b[:,1]],rcond=None)[0]
affine=np.array([[scale,-rotation,dx],[rotation,scale,dy],[0,0,1]])
errors=np.linalg.norm(np.c_[a,np.ones(len(a))]@affine[:2].T-b,axis=1)
if np.sqrt(np.mean(errors**2))>1:raise ValueError('Source artwork correspondence no longer fits')
inverse=np.linalg.inv(affine)
page=fitz.open(pdf)[1];curve=[]
for kind,*ps in page.get_drawings()[5142]['items']:
 if kind=='c':
  p,q,r,s=np.array(ps)
  curve.extend([((1-t)**3*p+3*(1-t)**2*t*q+3*(1-t)*t*t*r+t**3*s)*alignment['basisScale'] for t in np.linspace(0,1,100)])
 elif kind=='l':curve.extend(np.array(ps)*alignment['basisScale'])
 else:raise ValueError('Unknown source road operator')
sourceRoad=LineString(curve)
module=ast.parse((root/'scripts/build-europe-spectators.py').read_text('utf8'))
controls=next(ast.literal_eval(n.value) for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='controls' for t in n.targets))['monaco']
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
road=LineString(metric['road']+[metric['road'][0]]);pixels=[];world=[];keys=list(controls)
for i,k in enumerate(keys):
 nextKey=keys[(i+1)%len(keys)]
 sa=sourceRoad.project(Point(controls[k]));sb=sourceRoad.project(Point(controls[nextKey]))
 corner=lambda number:(np.array(next(c['coordinate'] for c in data['corners'] if c['number']==number))-origin)*factor
 wa=road.project(Point(corner(k)));wb=road.project(Point(corner(nextKey)))
 # Fixed samples match normalized progress between named turns on each road;
 # this constrains both sides of Z without treating the diagram as straight GIS.
 for t in np.linspace(0,1,21,endpoint=False):
  pixels.append(sourceRoad.interpolate((sa+t*((sb-sa)%sourceRoad.length))%sourceRoad.length).coords[0])
  world.append(road.interpolate((wa+t*((wb-wa)%road.length))%road.length).coords[0])
pixels=np.array(pixels);world=np.array(world);tri=Delaunay(pixels)
mapped=[]
for point in (np.c_[source['areas'][0]['sourceParts'][0]['pixelBoundary'],np.ones(len(source['areas'][0]['sourceParts'][0]['pixelBoundary']))]@inverse.T)[:,:2]:
 index=int(tri.find_simplex(point))
 if index<0:raise ValueError('Z requires geographic extrapolation; do not enable')
 ids=tri.simplices[index];x=np.c_[pixels[ids],np.ones(3)];y=np.c_[world[ids],np.ones(3)]
 if np.linalg.det(x)*np.linalg.det(y)<=0:raise ValueError('Used registration triangle folds')
 mapped.append(np.r_[point,1]@np.linalg.solve(x,world[ids]))
shape=Polygon(mapped)
if not shape.is_valid:raise ValueError('Registered outline is invalid')
roadSurface=unary_union([Polygon(t) for t in metric['triangles']]);issues=[]
if shape.intersection(roadSurface).area>1e-6:issues.append('Source outline intersects rendered road')
for zone in data['spectatorZones']:
 if zone['zoneId']=='z-quai-kennedy':continue
 for surface in zone.get('surfaces',[]):
  if shape.intersection(Polygon((np.array(surface['boundary'])-origin)*factor)).area>1e-6:issues.append('Known footprint overlap: '+zone['zoneId'])
geo=lambda p:(origin+np.array(p)/factor).tolist()
boundary=[geo(p) for p in mapped];ref=road.interpolate(road.project(shape.centroid))
provenance=lambda method,notes:dict(url=source['sourceUrl'],checkedAt='2026-10-25',method=method,confidence='low' if method=='estimated' else 'high',notes=notes)
zone=dict(zoneId='z-quai-kennedy',name='Z · Quai Kennedy',kind='general-admission',availability='preparing',boundary=boundary,
 surface=dict(baseHeight=.04,rise=0,depth=0,eyeHeight=1.65),surfaces=[dict(surfaceId='z-quai-kennedy-1',boundary=boundary,baseHeight=.04,rise=0,eyeHeight=1.65,rows=0,terrainFollow=True,frontReference=geo([ref.x,ref.y]))],
 source=provenance('estimated','Own2026 standing-sector image outline; artwork similarity followed by source/actual-road arc correspondence. No road subtraction or visibility fitting. Diagram and inherited corner controls are approximate.'),
 openingSource=provenance('published','Organizer2026 public map explicitly identifies Z as a standing sector, not numbered seating.'),
 surfaceSource=provenance('estimated','Ground follows existing regional GEDTM30 at true scale, with0.04m numerical surface clearance and1.65m standing eye. No invented11-row stair bank. Local slabs, trees and barriers are incomplete.'),
 geometryReview=dict(checkedAt='2026-10-25',issues=issues or ['Awaiting sampled ground mesh and browser review.'],method='Source-road registration; no arbitrary footprint translation, trimming or height fitting.'))
zone['surfaces'][0]['viewRoadReference']=dict(coordinate=viewRoad['viewRoadCoordinate'],source=dict(url=viewRoad['source'],checkedAt='2026-10-25',method='extracted',confidence='medium',notes=viewRoad['method']))
out=root/'src/circuits/europe/monaco-standing-world.json';previous=read(str(out.relative_to(root))) if out.exists() else {}
if previous.get('zones'):
 old=previous['zones'][0]
 if all(zone[k]==old[k] for k in zone if k not in ['availability','geometryReview']):zone.update(availability=old['availability'],geometryReview=old['geometryReview'])
record=dict(circuitId='monaco',season=2026,sourceUrl=source['sourceUrl'],sourceSha256=source['sourceSha256'],basisPdfSha256=alignment['basisPdfSha256'],geometryFingerprint=hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),
 registration=dict(method='Source artwork similarity; piecewise affine between fixed normalized road-arc samples,21 per named-turn interval; Z must remain inside non-folded triangles.',artworkAffine=affine.tolist(),artworkRmsPixels=float(np.sqrt(np.mean(errors**2))),geographicPrecision='Approximate inherited corner registration, not independent surveyed accuracy.'),
 metricFrame=dict(origin=origin.tolist(),calibration=metric['calibration']),roadWidthMetres=data['trackGeometry']['widthMetres'],mappedAreaMetres2=shape.area,roadClearanceMetres=shape.distance(roadSurface),issues=issues,zones=[zone],
 previousZone=previous.get('previousZone',next(z for z in data['spectatorZones'] if z['zoneId']=='z-quai-kennedy')),
 unregisteredProducts=['Secteur Rocher'],limitation='Rocher is outside turn-control support and is not extrapolated. Facilities are not complete; a default view cannot certify every point.')
if previous.get('zones')==[zone] and previous.get('sceneAcceptance'):record['sceneAcceptance']=previous['sceneAcceptance']
record['previousDraftZone']=previous.get('previousDraftZone')
record['supersededReviews']=previous.get('supersededReviews',[])
if previous.get('zones') and previous['zones'][0]!=zone and previous['zones'][0]['availability']=='preparing':
 old=previous['zones'][0]
 if any(old.get(k)!=zone.get(k) for k in zone if k not in ['availability','geometryReview']):
  record['previousDraftZone']=old
  if previous.get('sceneAcceptance') and previous['sceneAcceptance'] not in record['supersededReviews']:record['supersededReviews'].append(previous['sceneAcceptance'])
out.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print('Z area/road clearance/known issues:',round(shape.area,2),round(shape.distance(roadSurface),2),issues)
