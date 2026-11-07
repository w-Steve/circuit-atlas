"""Final2026 C straight: authored seating and General Admission ground, shared road registration."""
import json,numpy as np,math,hashlib,copy
from pathlib import Path
from PIL import Image
from scipy.interpolate import UnivariateSpline,CubicSpline
from scipy.optimize import minimize_scalar
from shapely.geometry import Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
image=ROOT/'research/season-review/madrid2026/map-xl.webp'
assert hashlib.sha256(image.read_bytes()).hexdigest()=='99ac1e3d5f822f0b650da0f727956c7f8c7d64c9616327f4cfc0cedebacaf241'
pixels=np.array(Image.open('research/season-review/madrid2026/map-xl.webp').convert('RGB'));samples=[]
for x in range(160,449,5):
 expected=np.interp(x,[152,200,300,400,448],[368,315,254,205,185]);lo=max(0,int(expected)-23);hi=min(847,int(expected)+24);dark=np.all(pixels[lo:hi,x,:]<85,axis=1);runs=[];start=None
 for i,v in enumerate(np.r_[dark,False]):
  if v and start is None:start=i
  if not v and start is not None:
   if 5<=i-start<=20:runs.append(lo+(start+i-1)/2)
   start=None
 if runs:
  y=min(runs,key=lambda y:abs(y-expected))
  if abs(y-expected)<15:samples.append([x,y])
samples=np.array([[152,368],*samples,[448,185]],float);spl=UnivariateSpline(samples[:,0],samples[:,1],s=len(samples)*.5**2);sx=np.linspace(152,448,4000);sp=np.c_[sx,spl(sx)];sl=np.r_[0,np.cumsum(np.linalg.norm(np.diff(sp,axis=0),axis=1))]
m=json.loads(Path('artifacts/goal-review/madrid-main/metric.json').read_text('utf8'));d=json.loads(Path('src/circuits/generated/madrid.json').read_text('utf8'));o=np.array(m['origin']);factor=np.array([111320*math.cos(math.radians(o[1])),-111320])*m['calibration'];road=np.array(m['road'])[:,[0,2]];cs={c['number']:c['coordinate'] for c in d['corners']};i,j=[int(np.argmin(np.linalg.norm(road-(np.array(cs[n])-o)*factor,axis=1))) for n in [3,4]];step=1 if (j-i)%len(road)<(i-j)%len(road) else -1;target=np.array([road[(i+k*step)%len(road)] for k in range(min((j-i)%len(road),(i-j)%len(road))+1)]);tl=np.r_[0,np.cumsum(np.linalg.norm(np.diff(target,axis=0),axis=1))];curve=CubicSpline(tl,target,axis=0);scale=tl[-1]/sl[-1]
def warp(p):
 x=minimize_scalar(lambda x:(x-p[0])**2+(spl(x)-p[1])**2,bounds=(152,448),method='bounded').x;q=np.array([x,spl(x)]);v=np.array([1,spl(x,1)]);side=np.dot(p-q,[-v[1],v[0]])/np.linalg.norm(v);a=np.interp(x,sx,sl)/sl[-1]*tl[-1];t=curve(a,1);return curve(a)+np.array([-t[1],t[0]])/np.linalg.norm(t)*side*scale
assert m['inputs']=={k:d[k] for k in ['trackGeometry','corners','elevation']}
rp=unary_union([Polygon(t) for t in m['triangles']]);result=[]
for name,px in [('gc1gc2',[[219,314],[324,249],[330,259],[225,324],[219,314]]),('ground',[[194,303],[321,225],[327,234],[199,312],[194,303]])]:
 boundary=np.array(px);mapped=[]
 for a,b in zip(boundary[:-1],boundary[1:]):
  n=max(1,math.ceil(np.linalg.norm(b-a)))
  for t in np.arange(n)/n:mapped.append(warp(a+t*(b-a)))
 row=None
 if name=='gc1gc2':
  count=max(math.ceil(np.linalg.norm(boundary[1]-boundary[0])),math.ceil(np.linalg.norm(boundary[2]-boundary[3])))
  front=np.array([warp(boundary[0]+t*(boundary[1]-boundary[0])) for t in np.linspace(0,1,count+1)])
  back=np.array([warp(boundary[3]+t*(boundary[2]-boundary[3])) for t in np.linspace(0,1,count+1)])
  mapped=[*front,*back[::-1]];row={'front':(o+front/factor).tolist(),'back':(o+back/factor).tolist(),'minimumDepthMetres':float(np.min(np.linalg.norm(front-back,axis=1)))}
 mapped.append(mapped[0]);sh=Polygon(mapped);assert sh.is_valid;assert sh.intersection(rp).area<1e-6;others=[]
 for z in d['spectatorZones']:
  if z['zoneId']==('stand-5' if name=='gc1gc2' else 'ga-c-straight'):continue
  for bank in z['surfaces']:
   area=sh.intersection(Polygon((np.array(bank['boundary'])-o)*factor)).area
   if area>1e-6:
    assert z['availability']!='available','Active area overlap: '+z['zoneId']
    others.append([z['zoneId'],z['availability'],area])
 print(name,'valid',sh.is_valid,'road',sh.intersection(rp).area,'clearance',sh.distance(rp),'others',others)
 result.append({'name':name,'boundary':(o+np.array(mapped)/factor).tolist(),'sourcePixels':px,'roadIntersection':sh.intersection(rp).area,'roadClearance':sh.distance(rp),'otherIntersections':others,'rowStrip':row})
assert Polygon((np.array(result[0]['boundary'])-o)*factor).intersection(Polygon((np.array(result[1]['boundary'])-o)*factor)).area<1e-6,'Seating and ground candidates overlap'
print('samples',len(samples),'scale',scale,'fitRMSpixels',np.sqrt(np.mean((spl(samples[:,0])-samples[:,1])**2)))

url='https://www.madring.com/img/xl/mapa-madring/mapa_web_11_8_26_ing.webp'
out=ROOT/'src/circuits/europe/madrid-c-2026.json';previous=json.loads(out.read_text('utf8')) if out.exists() else {};banks=[]
def provenance(method,notes):return dict(url=url,checkedAt='2026-10-26',method=method,confidence='low',notes=notes)
for area in result:
 center=np.mean(np.array(area['sourcePixels'])[:-1],axis=0)
 refX=minimize_scalar(lambda x:(x-center[0])**2+(spl(x)-center[1])**2,bounds=(152,448),method='bounded').x
 refArc=np.interp(refX,sx,sl)/sl[-1]*tl[-1];reference=(o+curve(refArc)/factor).tolist()
 seated=area['name']=='gc1gc2';zid='stand-5' if seated else 'ga-c-straight'
 prior=next((b for b in previous.get('banks',[]) if b['zone']['zoneId']==zid),None)
 old=prior['oldZone'] if prior else next((z for z in d['spectatorZones'] if z['zoneId']==zid),None)
 source=provenance('estimated','2026最终图可见外框手读，含约1–2像素不确定；沿56处可见路面截面拟合中线，再用T3–T4真实GIS弧长配准。未以净距或照片拟合。')
 if seated:
  zone=copy.deepcopy(old);depth=area['rowStrip']['minimumDepthMetres'];rows=max(5,int(depth/.85));rise=round((rows-1)*.4,2)
  zone.update(name='GC1–GC2 看台',boundary=area['boundary'])
  strip={k:v for k,v in area['rowStrip'].items() if k in ['front','back']};strip['source']=source
  zone['surfaces'][0].update(boundary=area['boundary'],rowStrip=strip,rows=rows,rise=rise,frontReference=reference);zone['surface'].update(depth=round(depth,2),rise=rise)
  zone['surfaceSource']=provenance('estimated','源图前后边对应为连续座席；按最小横向深度、约0.85m排距和0.4m排升估计。原3.2m平台和1.2m坐姿眼高保留，无实测断面，不为视野调高。')
 else:
  surface=dict(surfaceId=zid+'-1',boundary=area['boundary'],baseHeight=.04,rise=0,eyeHeight=1.65,rows=0,terrainFollow=True,frontReference=reference)
  zone=dict(zoneId=zid,name='C 区地面观赛区',kind='general-admission',boundary=area['boundary'],surfaces=[surface],surface=dict(baseHeight=.04,rise=0,depth=0,eyeHeight=1.65),admissionNote='图示范围含无障碍设施，局部平台未单独还原。')
  zone['surfaceSource']=provenance('estimated','使用已有区域DEM和0.04m数值间隙，站姿眼高1.65m；不凭图中颜色推断地表材质，不编造局部坡台。无障碍设施图标不等于平台几何或预订资格。')
 zone['source']=source;zone['openingSource']=provenance('published','2026最终图明确标GC1·GC2座席，另一侧眼形标识对应General Admission图例。两类区域分别建模，不将后方FanZone斜纹当观赛范围；不推断票区互通或独立票种数量。')
 zone['availability']='preparing';zone['geometryReview']=dict(checkedAt='2026-10-26',issues=['Awaiting seated/standing mesh and three-viewport scene acceptance.'],method='Authored visible envelope, observed road registration; no road/active-region overlaps. Platform details remain unmodeled.')
 if prior:
  a=copy.deepcopy(prior['zone']);b=copy.deepcopy(zone)
  for q in [a,b]:q.pop('availability',None);q.pop('geometryReview',None)
  if a==b:zone['availability']=prior['zone']['availability'];zone['geometryReview']=prior['zone']['geometryReview']
 entry=dict(zone=zone,oldZone=old,sourceBoundaryPixels=area['sourcePixels'],roadIntersectionMetres2=area['roadIntersection'],roadClearanceMetres=area['roadClearance'],otherIntersections=area['otherIntersections'])
 if prior and a==b and 'sceneAcceptance' in prior:entry['sceneAcceptance']=prior['sceneAcceptance']
 banks.append(entry)
record=dict(circuitId='madrid',season=2026,geometryFingerprint=hashlib.sha256(json.dumps({k:d[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),sourceUrl=url,sourceSha256=hashlib.sha256(image.read_bytes()).hexdigest(),sourceRoadPixels=samples.tolist(),sourceRoadFitRmsPixels=float(np.sqrt(np.mean((spl(samples[:,0])-samples[:,1])**2))),metresPerPixel=float(scale),roadCornerNumbers=[3,4],method='Half-pixel bounded smoothing of visible road pixels; normalized GIS arc and uniform lateral metric scale. Source-bank edges sampled<=1pixel. Paired seating edges use existing shared rowStrip system.',banks=banks,inventoryComplete=False,limitation='Approximate ground envelope; endpoint accessibility platform/eligibility and all site obstacles not independently resolved. Internal pixel fit is not surveyed positional accuracy. Public inventory remains incomplete.')
if previous.get('banks')==banks and previous.get('sceneAcceptance'):record['sceneAcceptance']=previous['sceneAcceptance']
out.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
