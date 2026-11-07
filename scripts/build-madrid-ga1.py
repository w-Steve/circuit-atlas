"""Register final2026 GA1 against observed road pixels; never clearance-fit."""
from pathlib import Path
import copy,hashlib,json,math
import numpy as np,cv2
from PIL import Image
from scipy.interpolate import CubicSpline
from shapely.geometry import Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
image=ROOT/'research/season-review/madrid2026/map-xl.webp'
assert hashlib.sha256(image.read_bytes()).hexdigest()=='99ac1e3d5f822f0b650da0f727956c7f8c7d64c9616327f4cfc0cedebacaf241'
d=read('src/circuits/generated/madrid.json');metric=read('artifacts/goal-review/madrid-main/metric.json')
assert metric['inputs']=={k:d[k] for k in ['trackGeometry','corners','elevation']}
pixels=np.array(Image.open(image).convert('RGB'));samples=[]
for y in range(430,721,5):
 dark=np.all(pixels[y,175:260,:]<85,axis=1);runs=[];start=None
 for i,v in enumerate(np.r_[dark,False]):
  if v and start is None:start=i
  if not v and start is not None:
   if 5<=i-start<=15:runs.append(175+(start+i-1)/2)
   start=None
 expected=191+(y-430)*.168
 if runs:
  center=min(runs,key=lambda x:abs(x-expected))
  if abs(center-expected)<6:samples.append([center,y])
samples=np.array(samples);assert len(samples)==52
coef=np.polyfit(samples[:,1],samples[:,0],1);source=np.array([[np.polyval(coef,y),y] for y in [423,731]])
r,g,b=[pixels[:,:,i].astype(float) for i in range(3)]
mask=((g>r*1.6)&(g>b*1.2)&(g<180)).astype('uint8');_,labels,_,_=cv2.connectedComponentsWithStats(mask,8)
contours=cv2.findContours((labels==labels[650,210]).astype('uint8'),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0];assert len(contours)==1
boundary=cv2.approxPolyDP(contours[0],1,True)[:,0,:];boundary=np.vstack([boundary,boundary[0]])
rawBoundary=boundary.copy()
# Fixed source-art occlusions, selected from the source image before world clearance checks:
# TV boxes obscure two straight edges; a fan-zone hatch touches the left edge.
assert boundary.tolist()[7]==[178,671] and boundary.tolist()[19]==[214,679] and boundary.tolist()[23]==[196,589]
boundary=np.delete(boundary,[4,5,6,7,8,9,10,19,20,23,24],axis=0)
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
road=np.array(metric['road'])[:,[0,2]];corners={c['number']:c['coordinate'] for c in d['corners']}
i,j=[int(np.argmin(np.linalg.norm(road-(np.array(corners[n])-origin)*factor,axis=1))) for n in [1,22]]
step=1 if (j-i)%len(road)<(i-j)%len(road) else -1
target=np.array([road[(i+k*step)%len(road)] for k in range(min((j-i)%len(road),(i-j)%len(road))+1)])
tl=np.r_[0,np.cumsum(np.linalg.norm(np.diff(target,axis=0),axis=1))];curve=CubicSpline(tl,target,axis=0)
v=source[1]-source[0];length=np.linalg.norm(v);normal=np.array([-v[1],v[0]])/length;scale=tl[-1]/length
along=lambda p:np.clip(np.dot(p-source[0],v)/(length*length),0,1)*tl[-1]
def warp(p):
 a=along(p);side=np.dot(p-source[0],normal);t=curve(a,1);n=np.array([-t[1],t[0]])/np.linalg.norm(t)
 return curve(a)+n*side*scale
mapped=[]
for a,b in zip(boundary[:-1],boundary[1:]):
 count=max(1,math.ceil(np.linalg.norm(b-a)))
 for t in np.arange(count)/count:mapped.append(warp(a+t*(b-a)))
mapped.append(mapped[0]);shape=Polygon(mapped);assert shape.is_valid
roadShape=unary_union([Polygon(t) for t in metric['triangles']]);assert shape.intersection(roadShape).area<1e-6
conflicts=[]
for z in d['spectatorZones']:
 if z['zoneId']=='stand-1':continue
 for bank in z['surfaces']:
  area=shape.intersection(Polygon((np.array(bank['boundary'])-origin)*factor)).area
  if area>1e-6:
   assert z['availability']!='available','Active bank intersects GA1: '+z['zoneId']
   conflicts.append(dict(zoneId=z['zoneId'],areaMetres2=area,availability=z['availability']))
out=ROOT/'src/circuits/europe/madrid-ga1-2026.json';previous=json.loads(out.read_text('utf8')) if out.exists() else {}
old=previous.get('oldZone') or next(z for z in d['spectatorZones'] if z['zoneId']=='stand-1')
zone=copy.deepcopy(old);zone.update(name='GA1 主看台',boundary=(origin+np.array(mapped)/factor).tolist())
zone['surfaces'][0]['boundary']=zone['boundary'];reference=curve(along(np.mean(boundary[:-1],axis=0)))
zone['surfaces'][0]['frontReference']=(origin+reference/factor).tolist()
url='https://www.madring.com/img/xl/mapa-madring/mapa_web_11_8_26_ing.webp'
def provenance(method,notes):return dict(url=url,checkedAt='2026-10-26',method=method,confidence='low',notes=notes)
zone['source']=provenance('estimated','2026官方最终场馆图GA1图示外界；以可见路面中线作弧长配准，非测绘。两处电视图标及相邻花纹遮挡的边界按可见端点直线续接，属于估算。')
zone['openingSource']=provenance('published','2026-09-03主办方场馆图标注GA1，位于主直道外侧，使用看台图例；不将6月数字票区直接等同最终字母票区。')
zone['surfaceSource']=provenance('estimated','保留原暂估3.2m平台/16m升高/32排及1.2m坐姿眼高；最终图不提供实测断面，不按照片是否可见赛车调整高度。')
zone['availability']='preparing'
zone['geometryReview']=dict(checkedAt='2026-10-26',issues=['Awaiting final-bank mesh and three-viewport scene acceptance.'],method='Authored outline and road-medial registration; no active-bank/road intersections. Old withheld stand-2 remains independently unresolved.')
if previous.get('zone'):
 prior=copy.deepcopy(previous['zone']);current=copy.deepcopy(zone)
 for value in [prior,current]:
  value.pop('availability',None);value.pop('geometryReview',None)
 if prior==current:zone['availability']=previous['zone']['availability'];zone['geometryReview']=previous['zone']['geometryReview']
record=dict(circuitId='madrid',season=2026,sourceUrl=url,sourceSha256=hashlib.sha256(image.read_bytes()).hexdigest(),rawSourceBoundaryPixels=rawBoundary.tolist(),sourceBoundaryPixels=boundary.tolist(),occlusionTreatments='Straight continuation between visible border endpoints across two TV pictograms and one touching fan-zone hatch. These hidden edge intervals are estimates, not traced measured boundaries.',sourceRoadMedialPixels=samples.tolist(),sourceRoadLine=source.tolist(),sourceRoadFitRmsPixels=float(np.sqrt(np.mean((samples[:,0]-np.polyval(coef,samples[:,1]))**2))),metresPerPixel=float(scale),method='Normalized road arc and uniform lateral metric scale; no clearance/visibility optimization. Subsegments<=1pixel; smooth GIS tangents avoid folds.',geometryFingerprint=hashlib.sha256(json.dumps({k:d[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),roadIntersectionMetres2=shape.intersection(roadShape).area,roadClearanceMetres=shape.distance(roadShape),withheldConflicts=conflicts,oldZone=old,zone=zone,limitation='Schematic map/estimated cross-section, not surveyed seats. Withheld banks are not rendered; their source errors remain outstanding.')
if previous.get('zone')==zone and previous.get('sceneAcceptance'):record['sceneAcceptance']=previous['sceneAcceptance']
out.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print('GA1 medial samples',len(samples),'road clearance',round(record['roadClearanceMetres'],3),'inactive conflicts',conflicts)
