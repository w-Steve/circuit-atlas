"""Measure Rocher source-artwork coverage by the actual registration controls.
This is a support-domain audit, not a geographic ticket boundary or availability.
"""
import ast,hashlib,json
from pathlib import Path
import fitz,numpy as np
from shapely.geometry import LineString,MultiPoint,Point,Polygon

ROOT=Path(__file__).resolve().parents[1]
def read(name):return json.loads((ROOT/name).read_text('utf8'))

def audit():
 source=read('src/circuits/europe/monaco-standing-2026.json')
 alignment=read('src/circuits/europe/monaco-map-alignment.json')
 image=ROOT/'research/season-review/monaco2026/public-map.jpg'
 if hashlib.sha256(image.read_bytes()).hexdigest()!=source['sourceSha256']:raise ValueError('Public source artwork changed')
 pdf=ROOT/'research/europe/monaco-official.pdf'
 if hashlib.sha256(pdf.read_bytes()).hexdigest()!=alignment['basisPdfSha256']:raise ValueError('Registration basis changed')
 a=np.array(alignment['basisPixels']);b=np.array(alignment['publicPixels'])
 matrix=np.array([[x,-y,1,0] for x,y in a]+[[y,x,0,1] for x,y in a])
 scale,rotation,dx,dy=np.linalg.lstsq(matrix,np.r_[b[:,0],b[:,1]],rcond=None)[0]
 inverse=np.linalg.inv(np.array([[scale,-rotation,dx],[rotation,scale,dy],[0,0,1]]))
 page=fitz.open(pdf)[1];curve=[]
 for kind,*ps in page.get_drawings()[5142]['items']:
  if kind=='c':
   p,q,r,s=np.array(ps)
   curve.extend([((1-t)**3*p+3*(1-t)**2*t*q+3*(1-t)*t*t*r+t**3*s)*alignment['basisScale'] for t in np.linspace(0,1,100)])
  elif kind=='l':curve.extend(np.array(ps)*alignment['basisScale'])
  else:raise ValueError('Unknown road drawing operator')
 road=LineString(curve)
 module=ast.parse((ROOT/'scripts/build-europe-spectators.py').read_text('utf8'))
 controls=next(ast.literal_eval(n.value) for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='controls' for t in n.targets))['monaco']
 keys=list(controls);support=[]
 for i,key in enumerate(keys):
  start=road.project(Point(controls[key]));end=road.project(Point(controls[keys[(i+1)%len(keys)]]))
  support.extend(road.interpolate((start+t*((end-start)%road.length))%road.length).coords[0] for t in np.linspace(0,1,21,endpoint=False))
 hull=MultiPoint(support).convex_hull;parts=[]
 area=next(a for a in source['areas'] if a['productId']=='rocher')
 for i,part in enumerate(area['sourceParts']):
  pixels=np.array(part['pixelBoundary']);points=(np.c_[pixels,np.ones(len(pixels))]@inverse.T)[:,:2];polygon=Polygon(points)
  if not polygon.is_valid:raise ValueError('Invalid source outline')
  parts.append(dict(part=i+1,vertexCount=len(points),unsupportedVertexCount=sum(not hull.covers(Point(p)) for p in points),
   outsideSupportAreaFraction=round(polygon.difference(hull).area/polygon.area,8),
   minimumSupportDistanceBasisPixels=round(polygon.distance(hull),3)))
 return dict(circuitId='monaco',season=2026,checkedAt='2026-10-26',product='Secteur Rocher',sourceUrl=source['sourceUrl'],sourceSha256=source['sourceSha256'],basisPdfSha256=alignment['basisPdfSha256'],
  method='Exact source-image similarity and21 normalized source-road samples per named-turn interval, matching build-monaco-standing-world.py. Convex support only; no geographic extrapolation.',
  controlCount=len(support),parts=parts,
  decision='No geographic model generated. Independent matched street/landmark controls are required outside the racing-line support.',
  missingEvidence=['Identifiable image locations with independent geographic coordinates surrounding the entire Rocher outline.','Local footpaths/platform/retaining-wall geometry for reliable standing-eye simulation.'],
  excludedShortcuts=['Nearby OSM forest parcels are not2026 ticket-access boundaries.','Street names alone do not identify an exact corresponding image/GPS control point.','A new terrain grid supplies heights, not ticket-area georeferencing.'],
  supplementaryRetrievals=[dict(url=url,status=404,decision='Not acquired; search metadata is not downloaded source evidence.') for url in ['https://www.fia.com/sites/default/files/media_kit_2026_gb_03.06_1.pdf','https://www.fia.com/sites/default/files/guide_media_2026_2_0.pdf']],
  limitation='Distances are in source artwork pixels, not metres or surveyed error. This report does not certify public access, model accuracy or visibility.')

if __name__=='__main__':
 result=audit();path=ROOT/'src/circuits/season-review/monaco-rocher-support-review.json';path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n','utf8')
 print('Rocher source parts: outside-support fractions',[p['outsideSupportAreaFraction'] for p in result['parts']])
