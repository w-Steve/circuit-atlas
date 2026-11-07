"""Reject geographic promotion of a wayfinding icon without external accuracy."""
import hashlib,json,math,xml.etree.ElementTree as ET
from pathlib import Path
import fitz
import numpy as np
from shapely.geometry import Polygon,MultiPoint,Point
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
xmlPath=ROOT/'research/season-review/silverstone-woodcote-c/osm-20261028.xml'
meta=read('research/season-review/silverstone-woodcote-c/osm-20261028.json')
assert meta['status']==200 and hashlib.sha256(xmlPath.read_bytes()).hexdigest()==meta['sha256']
xml=ET.fromstring(xmlPath.read_bytes());nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in xml.findall('node')}
assert not any({t.get('k'):t.get('v') for t in e.findall('tag')}.get('name','').lower()=='woodcote c' for e in xml)
pdf=ROOT/'research/season-review/silverstone-abbey/2026-map-mirror.pdf'
pdfSha=hashlib.sha256(pdf.read_bytes()).hexdigest();assert pdfSha=='3516fbf5bdab374c4a4f53b8a975cbd9ea0714408bd11f6be3c198f05f3e336c'
doc=fitz.open(pdf);assert doc.metadata['title']=='2026_F1_GB_WayfindingMap_Positive_AWVI'
drawings=doc[0].get_drawings()
def map_points(index):
 d=drawings[index];assert d['fill'][0]>.7 and d['fill'][1]<.2
 p=np.array([[item[1].x,item[1].y] for item in d['items'] if item[0]=='l']);assert p.shape==(4,2);return p
metric=read('artifacts/goal-review/silverstone-standing-metric.json');data=read('src/circuits/generated/silverstone.json')
assert metric['inputs']=={k:data[k] for k in ['trackGeometry','corners','elevation']}
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
def geographic(wayId):
 way=next(w for w in xml.findall('way') if w.get('id')==str(wayId))
 return np.array([nodes[n.get('ref')] for n in way.findall('nd')])
def world(wayId):return (geographic(wayId)-origin)*factor
# Match ends by their physical order toward the named neighbors and the track
# side. Do not select a correspondence by which candidate clears the road.
pixels=np.vstack([map_points(104),map_points(99)])
target=np.vstack([world(227342452)[[0,3,2,1]],world(227342459)[[1,0,3,2]]])
x=np.c_[pixels,np.ones(8)];matrix=np.linalg.lstsq(x,target,rcond=None)[0]
rms=float(np.sqrt(np.mean(np.sum((x@matrix-target)**2,axis=1))))
heldMap=np.array(Polygon(map_points(106)).centroid.coords)[0];heldActual=np.array(Polygon(world(227342450)).centroid.coords)[0]
error=float(np.linalg.norm(np.r_[heldMap,1]@matrix-heldActual))
c=map_points(197);projected=np.c_[c,np.ones(4)]@matrix
width=float(min(np.linalg.norm(b-a) for a,b in zip(projected,np.roll(projected,-1,axis=0))))
assert error>20 and error>width,'Source changed; independently re-review before accepting any candidate'
record={'circuitId':'silverstone','season':2026,'zoneId':'woodcote-c','checkedAt':'2026-10-28','annualIdentityVerified':True,
 'annualMap':{'url':'https://gpdestinations.com/wp-content/uploads/2026/06/2026-British-GP-Silverstone-Spectator-Map.pdf','publisher':'Silverstone','title':doc.metadata['title'],'sha256':pdfSha,'drawingIndex':197,'mapPolygon':c.tolist()},
 'osmSnapshot':meta,'namedNativeFootprintFound':False,
 'registration':{'controlWays':[227342452,227342459],'mapControls':pixels.tolist(),'metricControls':target.tolist(),'mapToMetric':matrix.tolist(),'internalRmsMetres':rms,'heldOutWay':227342450,'heldOutMapCentroid':heldMap.tolist(),'heldOutActualMetricCentroid':heldActual.tolist(),'externalErrorMetres':error,'projectedWidthMetres':width,'outsideControlHullMapUnits':[float(MultiPoint(pixels).convex_hull.distance(Point(p))) for p in c]},
 'geometryAccepted':False,'runtimeBoundaryPromoted':False,'requiredWork':'Obtain an independent geographic footprint or reliable registration controls with external accuracy. The annual name and approximate icon do not certify a selectable seating plane.',
 'limits':'OSM supplies exact coordinates for named A/B/National stands, not a currently named C footprint in this bbox. Nearby anonymous buildings and bleachers are not silently renamed. No guessed position is shifted, cropped or raised to pass geometry tests. Existing C road intersection remains unresolved.'}
(ROOT/'src/circuits/europe/silverstone-woodcote-c-review-2026.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
print(f'2026 identity confirmed; no named C footprint; internal fit {rms:.2f}m, external error {error:.2f}m > width {width:.2f}m; candidate rejected, runtime unchanged.')
