"""Interpret GA1/GA2 factual boundaries from the retained official 2026 venue PDF.
No organizer artwork is shipped. Diagram-to-GIS registration is approximate.
Run export-spectator-audit.ts europe before acquisition; replay uses retained JSON.
"""
import json,math,hashlib
from pathlib import Path
import numpy as np
import fitz
from scipy.spatial import Delaunay
from shapely.geometry import LineString,Polygon,box
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
source_url='https://www.dutchgp.com/app/uploads/2026/07/2026_F1_Netherlands_WayfindingMap_Negative_VISUAL.pdf'
data=read('src/circuits/generated/zandvoort.json');metric=next(r for r in read('artifacts/map-audit/metric-geometry.json') if r['id']=='zandvoort')
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
controls=read('src/circuits/europe/review.json')['zandvoort']['imageControls'];pixels=np.array(list(controls.values()),dtype=float)/1.5
geo=np.array([next(c['coordinate'] for c in data['corners'] if c['number']==int(n)) for n in controls]);world=(geo-origin)*factor
# Pad the control hull using its global affine continuation. This keeps the
# piecewise-affine registration continuous outside the real corner-control hull;
# padded values are mathematical extrapolation, never surveyed ground controls.
lo=pixels.min(0)-200;hi=pixels.max(0)+200;pad=np.array([[lo[0],lo[1]],[hi[0],lo[1]],[hi[0],hi[1]],[lo[0],hi[1]]])
fit=np.linalg.lstsq(np.c_[pixels,np.ones(len(pixels))],world,rcond=None)[0]
world=np.r_[world,np.c_[pad,np.ones(4)]@fit];pixels=np.r_[pixels,pad];tri=Delaunay(pixels)
def register(ring):
 out=[]
 for point in ring:
  k=int(tri.find_simplex(point))
  if k<0:raise ValueError('Registration point outside padded envelope')
  ids=tri.simplices[k];out.append(np.r_[point,1]@np.linalg.solve(np.c_[pixels[ids],np.ones(3)],world[ids]))
 return out
def trace(drawing):
 points=[]
 for item in drawing['items']:
  if item[0]=='l':points.extend([list(item[1]),list(item[2])])
  elif item[0]=='c':
   a,b,c,d=[np.array(p) for p in item[1:]]
   points.extend(((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d).tolist() for t in np.linspace(0,1,24))
  else:raise ValueError('Unexpected GA vector primitive')
 return points
road=unary_union([Polygon(t) for t in metric['triangles']]);objects=[]
for zone in data['spectatorZones']:
 if zone['zoneId'] in ['ga1','ga2']:continue
 for s in zone.get('surfaces',[]):objects.append(Polygon((np.array(s['boundary'])-origin)*factor))
for building in data.get('facilities',{}).get('buildings',[]):objects.append(Polygon((np.array(building['boundary'])-origin)*factor))
for lane in data.get('facilities',{}).get('pitLanes',[]):
 if not lane.get('underground'):objects.append(LineString((np.array(lane['coordinates'])-origin)*factor).buffer(lane['widthMetres']/2))
water=read('src/circuits/water/zandvoort.json')
water_shapes=[Polygon((np.array(f['rings'][0])-origin)*factor,[(np.array(r)-origin)*factor for r in f['rings'][1:]]) for f in water['features']]
occupied=unary_union([road.buffer(.75),unary_union(objects).buffer(.5),unary_union(water_shapes).buffer(.5)])
pdf_bytes=(ROOT/'research/europe/zandvoort-official.pdf').read_bytes()
pdf_sha256=hashlib.sha256(pdf_bytes).hexdigest()
if pdf_sha256!='4803c1842b95c99abe39bad0ffde8566328427e29d90e3088f979b17fefe00d6':raise ValueError('Recheck the official 2026 PDF before extracting changed artwork')
page=fitz.open(stream=pdf_bytes,filetype='pdf')[0];drawings=page.get_drawings();output=[]
for name,index in [('GA1',383),('GA2',384)]:
 draw=drawings[index];colour=draw.get('fill') or draw['color']
 if not(abs(colour[0]-.586)<.01 and abs(colour[1]-.106)<.01):raise ValueError('Source PDF changed')
 curve=trace(draw);pdf=LineString(curve).buffer(draw['width']/2,quad_segs=6) if name=='GA1' else Polygon(curve)
 mapped=Polygon(register(list(pdf.exterior.coords)))
 if not mapped.is_valid:raise ValueError(f'{name}: invalid registration; do not repair by inventing polygons')
 usable=mapped.difference(occupied)
 parts=[]
 # Source GA1 is a long curved bank. Subdivide into local selectable patches,
 # without inventing seat rows or joining gaps across the active track.
 minx,minz,maxx,maxz=usable.bounds;step=100
 for x in range(math.floor(minx/step),math.ceil(maxx/step)):
  for z in range(math.floor(minz/step),math.ceil(maxz/step)):
   clipped=usable.intersection(box(x*step,z*step,(x+1)*step,(z+1)*step))
   for part in getattr(clipped,'geoms',[clipped]):
    if part.geom_type=='Polygon' and part.area>=4 and not part.interiors:parts.append(part.simplify(.1,preserve_topology=True))
    elif part.geom_type=='Polygon' and part.area>=4:raise ValueError('Hole requires explicit accessible patch partition')
 print(name,'mapped area',round(mapped.area,1),'road overlap before',round(mapped.intersection(road).area,1),'usable',round(usable.area,1),'patches',len(parts),flush=True)
 output.append(dict(name=name,sourcePath=index,pdfBoundary=list(pdf.exterior.coords),sourceBoundary=(origin+np.array(mapped.exterior.coords)/factor).tolist(),removedSquareMetres=round(mapped.area-usable.area,3),patches=[(origin+np.array(part.exterior.coords)/factor).tolist() for part in parts]))
(ROOT/'artifacts/goal-review/zandvoort-ga-registration.json').write_text(json.dumps(dict(source=source_url,areas=output),ensure_ascii=False,indent=2)+'\n','utf8')

# Retain only factual coordinates and provenance in the distributable package.
def source(method,confidence,notes):return dict(url=source_url,checkedAt='2026-10-24',method=method,confidence=confidence,notes=notes)
zones=[]
for area in output:
 zone_id=area['name'].lower();surfaces=[]
 for i,boundary in enumerate(area['patches']):
  surfaces.append(dict(surfaceId=f'{zone_id}-{i+1}',boundary=boundary,baseHeight=.04,rise=0,eyeHeight=1.2,rows=0,terrainFollow=True))
 zones.append(dict(zoneId=zone_id,name=area['name']+' 普通观赛区',kind='general-admission',availability='preparing',boundary=area['patches'][0],surface=dict(baseHeight=.04,rise=0,depth=0,eyeHeight=1.2),surfaces=surfaces,
  source=source('estimated','low','Official 2026 PDF vector geometry: GA1 purple 10pt stroke, GA2 filled polygon. Registered by the existing 14 geographic corner controls at 1.5px/pt, with global-affine padded hull for continuous extrapolation. Diagram is schematic, not cadastral. Excludes rendered active road+0.75m and known stands/buildings/pit/water+0.5m; no translation. Divided into <=100m map patches only for continuous picking/local viewing, not real sector boundaries. Boundary simplification tolerance0.1m; tiny <4m2 remnants omitted. Source and excluded areas retained in accompanying evidence.'),
  openingSource=source('published','high','Official 2026 Dutch GP venue map legend explicitly identifies General Admission1–2; GA1 is on the outside bank, GA2 at the inside of the final section. This confirms admission category, not surveyed boundary coordinates or current ticket stock.'),
  surfaceSource=source('estimated','low','Unseated ground follows the existing GEDTM30 v1.2 source grid at actual vertical scale, subdivided into <=8m triangles. Mesh clearance0.04m avoids z-fighting; eye1.2m is a seated visitor. DTM is ~30m regional terrain, not a surveyed dune/terrace/fence. No fabricated rows, bank rise or height exaggeration. Estimated catch fences only on near-road public edges.')))
evidence=dict(circuitId='zandvoort',season=2026,checkedAt='2026-10-24',source=source_url,sourcePdf='research/europe/zandvoort-official.pdf',sourcePdfSha256=pdf_sha256,waterSource='src/circuits/water/zandvoort.json',registration='14 existing corner controls plus global affine continuation outside their hull; approximate source diagram',areas=output,zones=zones)
(ROOT/'src/circuits/europe/zandvoort-general-admission.json').write_text(json.dumps(evidence,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
