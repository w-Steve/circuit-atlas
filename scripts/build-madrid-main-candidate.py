"""Extract source-authored Madrid main-straight banks; no runtime promotion."""
import base64,hashlib,json,math,re,xml.etree.ElementTree as E
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
raw=(ROOT/'research/season-review/madrid2026/main-2026.svg').read_bytes();meta=read('research/season-review/madrid2026/main-svg-source.json')
assert hashlib.sha256(raw).hexdigest()==meta['sha256']=='d38ea7265618c3ed0dd4ffee4ab1c523326394d7998e749bc003a550b6136700'
source=np.array(read('research/season-review/madrid2026/main-svg-road.json')['points'])
d=read('src/circuits/generated/madrid.json');metric=read('artifacts/goal-review/madrid-main/metric.json')
assert metric['inputs']=={k:d[k] for k in ['trackGeometry','corners','elevation']},'Re-export changed road/corners/elevation first'
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
ll=np.array(d['trackGeometry']['coordinates']);geo=(ll-origin)*factor
length=np.r_[0,np.cumsum(np.linalg.norm(np.diff(geo,axis=0),axis=1))];q=np.arange(1000)/1000*length[-1];target=np.stack([np.interp(q,length,geo[:,i]) for i in range(2)],axis=1)
def fit(a,b):
 ac=a-a.mean(0);bc=b-b.mean(0);u,s,vt=np.linalg.svd(ac.T@bc);sign=np.eye(2);sign[1,1]=np.linalg.det(u@vt);rotation=u@sign@vt;scale=(s*np.diag(sign)).sum()/(ac*ac).sum();translation=b.mean(0)-a.mean(0)@rotation*scale
 return float(np.sqrt(np.mean(np.sum((a@rotation*scale+translation-b)**2,axis=1)))),rotation,scale,translation
best=None
for reverse in [False,True]:
 a=source[::-1] if reverse else source
 for offset in range(len(a)):
  result=fit(np.roll(a,offset,axis=0),target)
  if best is None or result[0]<best[0]:best=(*result,reverse,offset)
rms,rotation,scale,translation,reverse,offset=best
road=unary_union([Polygon(t) for t in metric['triangles']]);root=E.fromstring(raw);areas=[]
paths={662:'stand-2',666:'stand-1'}
for index,zid in paths.items():
 e=list(root.iter())[index];assert e.get('fill')=='#D1AC5A' and not e.get('transform');numbers=list(map(float,re.findall(r'-?\d+(?:\.\d+)?',e.get('d'))));assert len(numbers)==10
 pixels=np.array(numbers).reshape(-1,2)
 if not np.array_equal(pixels[0],pixels[-1]):pixels=np.vstack([pixels,pixels[0]])
 mapped=pixels@rotation*scale+translation;shape=Polygon(mapped)
 other=[]
 for z in d['spectatorZones']:
  if z['zoneId'] in paths.values():continue
  for surface in z.get('surfaces',[]):
   overlap=shape.intersection(Polygon((np.array(surface['boundary'])-origin)*factor)).area
   if overlap>1e-6:other.append({'zoneId':z['zoneId'],'overlapMetres2':overlap})
 areas.append(dict(zoneId=zid,sourceElementIndex=index,sourcePath=e.get('d'),sourcePixelBoundary=pixels.tolist(),candidateBoundary=(origin+mapped/factor).tolist(),areaMetres2=shape.area,roadIntersectionMetres2=shape.intersection(road).area,roadClearanceMetres=shape.distance(road),otherZoneIntersections=other))
record=dict(generatedSha256=hashlib.sha256((ROOT/'src/circuits/generated/madrid.json').read_bytes()).hexdigest(),circuitId='madrid',season=2026,status='candidate-not-applied',source=meta,sourcePage=read('research/season-review/madrid2026/tickets-fetch.json'),registration=dict(method='Orientation-preserving similarity fit of full authored SVG road and current GIS,1000 normalized arc-length samples, both traversal directions. No clearance or visibility optimization.',rmsMetres=rms,scaleMetresPerPixel=float(scale),rotation=rotation.tolist(),translation=translation.tolist(),reverse=reverse,offset=offset),areas=areas,nextAction='Review local road residual and source bank identity, then resolve genuine bank conflicts. Do not apply if roads or other banks intersect.',limitations=['SVG replay bytes do not match CDX SHA1; source response hash retained without original-capture certification.','June2026 ticket diagram may predate September layout revisions. Cross-check against dated final venue map before promotion.','Similarity residual is internal agreement, not survey precision. No height or row-count evidence is derived from diagram.'])
out=ROOT/'src/circuits/season-review/madrid-main-candidate.json'
previous=json.loads(out.read_text('utf8')) if out.exists() else {}
if previous.get('areas')==areas and previous.get('registration')==record['registration'] and previous.get('scenePreview'):record['scenePreview']=previous['scenePreview']
out.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
print('RMS',round(rms,3),'metres; scale',round(scale,3))
for a in areas:print(a['zoneId'],'road intersection',round(a['roadIntersectionMetres2'],3),'clearance',round(a['roadClearanceMetres'],3),'other',a['otherZoneIntersections'])
