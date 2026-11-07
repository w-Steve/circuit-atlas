"""Extract factual image-space standing areas, not unverified world geometry.

The organizer JPEG/WordPress metadata stay in research; only derived facts ship.
Requires Pillow, NumPy, SciPy and Shapely. Never writes rendered circuits.
"""
import hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label,binary_closing,binary_fill_holes
from shapely.geometry import box as pixel_box
from shapely.ops import unary_union

root=Path(__file__).resolve().parents[1]
research=root/'research/season-review/monaco2026'
image=research/'public-map.jpg'
digest=hashlib.sha256(image.read_bytes()).hexdigest()
expected='3d40d544403b11b070e28840079b7117ace6fe6cd2f553ffb8699ac98c3d887d'
if digest!=expected:raise ValueError('Organizer image changed; review before extraction')
meta=json.loads((research/'public-map-metadata.json').read_text('utf8'))
url='https://acm.mc/wp-content/uploads/2025/05/Plan_Circuit_GPF12026_1920x1800-4-scaled.jpg'
if meta['id']!=10620815 or meta['source_url']!=url or meta['date']!='2026-05-27T15:36:42':raise ValueError('Wrong organizer media revision')
rgb=np.array(Image.open(image).convert('RGB'))
if rgb.shape[:2]!=(2400,2560):raise ValueError('Wrong pixel coordinate frame')
r,g,b=rgb.astype(float).transpose(2,0,1)

def parts(mask,box,minimum):
 x0,y0,x1,y1=box
 roi=np.zeros(mask.shape,dtype=bool);roi[y0:y1,x0:x1]=mask[y0:y1,x0:x1]
 components,n=label(binary_closing(roi,iterations=1))
 result=[]
 for id in range(1,n+1):
  pixels=components==id
  if np.count_nonzero(pixels)<minimum:continue
  # Text, tree symbols and pictograms do not define access holes. Roads and
  # bridges opening onto the outer boundary still separate source components.
  filled=binary_fill_holes(pixels)
  # Trace pixel cells rather than their centers: center contours can collapse
  # a one-pixel neck into an invalid self-touching polygon on compressed JPEGs.
  runs=[]
  for y in np.flatnonzero(filled.any(axis=1)):
   edges=np.flatnonzero(np.diff(np.r_[False,filled[y],False].astype('int8')))
   for start,end in zip(edges[::2],edges[1::2]):runs.append(pixel_box(start-.5,y-.5,end-.5,y+.5))
  raw=unary_union(runs)
  if raw.geom_type!='Polygon' or not raw.is_valid:raise ValueError('Review disconnected source cells')
  tolerance=2
  outline=raw.simplify(tolerance,preserve_topology=True)
  while outline.symmetric_difference(raw).area/raw.area>.04 and tolerance>.25:
   tolerance/=2;outline=raw.simplify(tolerance,preserve_topology=True)
  if not outline.is_valid or outline.area<=0:raise ValueError('Invalid source polygon')
  change=outline.symmetric_difference(raw).area/raw.area
  if change>.04:raise ValueError('Simplification loses too much source area')
  result.append(dict(pixelBoundary=[list(p) for p in outline.exterior.coords],bounds=list(outline.bounds),colorPixels=int(pixels.sum()),filledPixels=int(filled.sum()),polygonAreaPixels2=outline.area,simplificationPixels=tolerance,simplificationDifferenceFraction=change))
 return sorted(result,key=lambda p:(p['bounds'][0],p['bounds'][1]))

green=(g>100)&(g<180)&(r>40)&(r<140)&(b<90)&(g>r*1.25)&(g>b*1.6)
rocher=parts(green,(150,850,850,1700),500)
red=(r>170)&(g<90)&(b<90)
z=parts(red,(1020,460,1210,620),2000)
if len(rocher)!=4 or len(z)!=1:raise ValueError('Review source standing-area components')
record=dict(circuitId='monaco',season=2026,checkedAt='2026-10-25',sourceUrl=url,sourceSha256=digest,
 sourceMetadataUrl='https://acm.mc/wp-json/wp/v2/media/10620815',sourceMediaId=meta['id'],sourcePublishedAt=meta['date'],
 sourceImageSize=[2560,2400],coordinateSpace='source-image pixels, x right / y down',worldGeometryReady=False,
 extraction=dict(method='JPEG color components in reviewed source windows; one-pixel closing, enclosed symbol-hole filling, outer contours simplified within2 pixels.',simplificationPixels=2),
 areas=[dict(productId='z',name='Z',kind='general-admission',modelZoneId='z-quai-kennedy',sourceParts=z),dict(productId='rocher',name='Secteur Rocher',kind='general-admission',modelZoneId=None,sourceParts=rocher)],
 limitation='Factual map-color extents only, not surveyed access boundaries. The four Rocher pieces are one ticket sector, not four products. Road/bridge gaps are retained. Geographic registration, slope and obstacles remain unverified; this file cannot enable viewpoints.')
out=root/'src/circuits/europe/monaco-standing-2026.json'
out.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
print('2026 organizer map: Z:1 outline, Rocher:4 parts; no world geometry enabled')
