"""Replay Madrid diagram-registration diagnostics without mutating circuit data."""
import hashlib,json,math
from pathlib import Path
import numpy as np
from scipy.spatial import Delaunay
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
image=ROOT/'research/season-review/madrid2026/map-xl.webp'
assert hashlib.sha256(image.read_bytes()).hexdigest()=='99ac1e3d5f822f0b650da0f727956c7f8c7d64c9616327f4cfc0cedebacaf241'
r=read('src/circuits/europe/review.json')['madrid'];d=read('src/circuits/generated/madrid.json')
origin=np.array(d['trackGeometry']['coordinates'][0]);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])
keys=list(r['imageControls']);pixels=np.array([r['imageControls'][k] for k in keys]);corners={str(c['number']):c['coordinate'] for c in d['corners']}
world=(np.array([corners[k] for k in keys])-origin)*factor;tri=Delaunay(pixels);areas=[]
assert len(r['manual'])==len(d['spectatorZones'])==15
for record,z in zip(r['manual'],d['spectatorZones']):
 assert record['name']==z['name'],'Historical rectangle identities differ from current banks; use the preserved historical review, not positional pairing'
 x,y,w,depth,angle=record['pixelRectangle'];k=int(tri.find_simplex([x,y]));outside=k<0
 if outside:k=int(np.argmin([np.linalg.norm(pixels[t].mean(0)-[x,y]) for t in tri.simplices]))
 indices=tri.simplices[k];matrix=np.linalg.solve(np.c_[pixels[indices],np.ones(3)],world[indices]);scales=np.linalg.svd(matrix[:2],compute_uv=False)
 areas.append(dict(zoneId=z['zoneId'],availability=z['availability'],pixelRectangle=record['pixelRectangle'],centerOutsideControlHull=outside,affineSingularScalesMetresPerPixel=scales.tolist(),anisotropyRatio=float(scales[0]/scales[1]),existingGeometryIssues=z.get('geometryReview',{}).get('issues',[])))
record=dict(circuitId='madrid',checkedAt='2026-10-26',sourceUrl='https://www.madring.com/img/xl/mapa-madring/mapa_web_11_8_26_ing.webp',sourceSha256=hashlib.sha256(image.read_bytes()).hexdigest(),sourceDimensions=[1200,847],annualEvidence='2026 event dates printed on map; live dated2026-09-03 mobility article embeds this asset. Current standalone facilities page has switched to2027 and is not used as2026 boundary evidence.',articleUrl='https://www.madring.com/en/press-releases/mobility-plan',generatedSha256=hashlib.sha256((ROOT/'src/circuits/generated/madrid.json').read_bytes()).hexdigest(),scope='Replay of prior rectangle construction and its recorded conflicts. Does not certify any physical polygon or independently re-run mesh collision detection.',areas=areas,findings=dict(rectangles=15,centersOutsideControlHull=sum(a['centerOutsideControlHull'] for a in areas),withheldRoadIntersections=sum(a['availability']!='available' and any('road intersection' in s for s in a['existingGeometryIssues']) for a in areas)),nextAction='Trace actual source seating-bank outlines and associate printed grandstand IDs; register North and South locally with independent geographic anchors. Preserve source outlines; do not shift/trim to pass clearance. Cross-check every previously available bank too.',limitations=['Delaunay control-hull inclusion is not a positional accuracy certificate.','Single-triangle extrapolation and artificial rectangles cannot establish the authored bank boundary.','17 mobility sections are not automatically17 ticket products; do not invent missing seats or GA from fan-zone color fills.','Heights and local banking/retaining walls require separate evidence.'])
(ROOT/'src/circuits/season-review/madrid-registration-review.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
print(record['findings'])
