"""Reject unsupported Madrid final-map registration without moving source banks."""
from pathlib import Path
import json,hashlib,math
import numpy as np,cv2
from PIL import Image
from shapely.geometry import Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
path=ROOT/'research/season-review/madrid2026/map-xl.webp'
assert hashlib.sha256(path.read_bytes()).hexdigest()=='99ac1e3d5f822f0b650da0f727956c7f8c7d64c9616327f4cfc0cedebacaf241'
pixels=np.array(Image.open(path).convert('RGB'));r,g,b=[pixels[:,:,i].astype(float) for i in range(3)]
mask=((g>r*1.6)&(g>b*1.2)&(g<180)).astype('uint8');_,labels,_,_=cv2.connectedComponentsWithStats(mask,8)
contours=cv2.findContours((labels==labels[650,210]).astype('uint8'),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]
assert len(contours)==1
boundary=cv2.approxPolyDP(contours[0],1,True)[:,0,:];boundary=np.vstack([boundary,boundary[0]])
d=read('src/circuits/generated/madrid.json');m=read('artifacts/goal-review/madrid-main/metric.json')
assert m['inputs']=={k:d[k] for k in ['trackGeometry','corners','elevation']}
origin=np.array(m['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*m['calibration'];corners={c['number']:c['coordinate'] for c in d['corners']}
a=np.array([[187,423],[163,417],[244,731]]);b=(np.array([corners[i] for i in [1,2,22]])-origin)*factor
ac=a-a.mean(0);bc=b-b.mean(0);u,s,vt=np.linalg.svd(ac.T@bc);rotation=u@vt;scale=s.sum()/(ac*ac).sum();translation=b.mean(0)-a.mean(0)@rotation*scale
shape=Polygon(boundary@rotation*scale+translation);road=unary_union([Polygon(t) for t in m['triangles']]);overlaps=[]
for z in d['spectatorZones']:
 if z['zoneId']=='stand-1':continue
 for bank in z['surfaces']:
  area=shape.intersection(Polygon((np.array(bank['boundary'])-origin)*factor)).area
  if area>1e-6:overlaps.append(dict(zoneId=z['zoneId'],areaMetres2=area))
report=dict(generatedSha256=hashlib.sha256((ROOT/'src/circuits/generated/madrid.json').read_bytes()).hexdigest(),circuitId='madrid',checkedAt='2026-10-26',status='rejected-label-control-registration',sourceUrl='https://www.madring.com/img/xl/mapa-madring/mapa_web_11_8_26_ing.webp',sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),sourceLabel='GA1',sourceBoundaryPixels=boundary.tolist(),method='Exact connected authored green component at seed210,650; external outline simplified1px. Printed lettering/icons are not physical holes. No dilation, clearance trimming or polygon translation.',controlNumbers=[1,2,22],controlPixels=a.tolist(),internalFitRmsMetres=float(np.sqrt(np.mean(np.sum((a@rotation*scale+translation-b)**2,axis=1)))),roadIntersectionMetres2=shape.intersection(road).area,otherZoneIntersections=overlaps,productionApplied=False,conclusion='Low internal residual does not validate label centers as road controls. Diagnostic inverse overlay places current GIS near the edge of the schematic black road along the main straight. Rebuild independent source road medial controls and verify final bank IDs before migration.',sourceIdentityLimitation='GA1 text and green fill alone do not establish a grass/general-admission ticket class. Do not equate June numbered banks with final lettered zones without evidence.',evidence='artifacts/goal-review/madrid-main-final')
(ROOT/'src/circuits/season-review/madrid-final-main-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print('Rejected registration: road',round(report['roadIntersectionMetres2'],2),'m2; other',overlaps)
