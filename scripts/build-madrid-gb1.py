"""Final2026 GB1/GB2 visible-border registration, independent of clearance/photography."""
import copy,hashlib,json,math,sys
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
bank=next((a.split('=',1)[1] for a in sys.argv[1:] if a.startswith('--bank=')),'gb1');assert bank in ['gb1','gb2']
zoneId='stand-2' if bank=='gb1' else 't1t3'
label=bank.upper()
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
image=ROOT/'research/season-review/madrid2026/map-xl.webp'
assert hashlib.sha256(image.read_bytes()).hexdigest()=='99ac1e3d5f822f0b650da0f727956c7f8c7d64c9616327f4cfc0cedebacaf241'
d=read('src/circuits/generated/madrid.json');metric=read('artifacts/goal-review/madrid-main/metric.json')
assert metric['inputs']=={k:d[k] for k in ['trackGeometry','corners','elevation']}
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
# Read between visible road edges; numbers obscure the apices, so these remain estimates.
controls=np.array([[189,421],[161,414],[152,368]],float);numbers=[1,2,3]
corners={c['number']:c['coordinate'] for c in d['corners']};target=(np.array([corners[n] for n in numbers])-origin)*factor
ac=controls-controls.mean(0);bc=target-target.mean(0);u,s,vt=np.linalg.svd(ac.T@bc);rotation=u@vt
assert np.linalg.det(rotation)>0
scale=s.sum()/(ac*ac).sum();translation=target.mean(0)-controls.mean(0)@rotation*scale
# Visible bank corners; y402 is the shared light divider, +/-1–2pixels.
pixels=np.array([[135,402],[145,402],[148,434],[138,436],[135,402]] if bank=='gb1' else [[137,364],[147,363],[145,402],[135,402],[137,364]],float)
mapped=pixels@rotation*scale+translation;shape=Polygon(mapped);assert shape.is_valid
road=unary_union([Polygon(t) for t in metric['triangles']]);assert shape.intersection(road).area<1e-6
conflicts=[]
for z in d['spectatorZones']:
 if z['zoneId']==zoneId:continue
 for otherSurface in z['surfaces']:
  area=shape.intersection(Polygon((np.array(otherSurface['boundary'])-origin)*factor)).area
  if area>1e-6:
   assert z['availability']!='available','Active region intersects GB1: '+z['zoneId']
   conflicts.append(dict(zoneId=z['zoneId'],areaMetres2=area,availability=z['availability']))
out=ROOT/f'src/circuits/europe/madrid-{bank}-2026.json';previous=json.loads(out.read_text('utf8')) if out.exists() else {}
old=previous.get('oldZone') or next(z for z in d['spectatorZones'] if z['zoneId']==zoneId)
zone=copy.deepcopy(old);boundary=(origin+mapped/factor).tolist();zone.update(name=label+' 看台',boundary=boundary)
centered=mapped[:-1]-mapped[:-1].mean(0);_,axes=np.linalg.eigh(centered.T@centered);depth=float(np.ptp(centered@axes[:,0]))
rows=max(5,int(depth/.85));rise=round((rows-1)*.4,2)
surface=zone['surfaces'][0];surface.update(boundary=boundary,rows=rows,rise=rise,frontReference=corners[2 if bank=='gb1' else 3])
zone['surface'].update(depth=round(depth,2),rise=rise)
url='https://www.madring.com/img/xl/mapa-madring/mapa_web_11_8_26_ing.webp'
def provenance(method,notes):return dict(url=url,checkedAt='2026-10-26',method=method,confidence='low',notes=notes)
zone['source']=provenance('estimated','2026最终图GB1的可见外边框；GB2分界取浅色横线中部，约1–2像素不确定。3处道路中线控制含编号遮挡估计，非测绘；未按净距或照片拟合。')
zone['openingSource']=provenance('published','2026-09-03主办方场馆图明确GB1看台，位于一、二号弯外侧；不把相邻编号贵宾区当普通观众看台。')
zone['surfaceSource']=provenance('estimated','原32排/16m升高不再强套新深度；按约0.85m排距、每排0.4m升高估计，保留3.2m平台与1.2m坐姿眼高。均无实测断面，不以摄影可见性调整。')
if bank=='gb2':
 zone['source']=provenance('estimated','2026最终图GB2可见外框；与GB1共用浅色横线中部边界，约1–2像素不确定。沿用同组3处道路中线估计，不按净距/摄影调整。')
 zone['openingSource']=provenance('published','2026-09-03主办方场馆图明确GB2看台，位于二、三号弯外侧。旧T1–T3工程矩形并非额外独立票种。')
 zone['surfaceSource']=provenance('estimated','按新边界深度约0.85m排距、每排0.4m升高估计，保留原3.2m平台与1.2m坐姿眼高。无实测断面，不以照片可见性调整。')
zone['availability']='preparing';zone['geometryReview']=dict(checkedAt='2026-10-26',issues=[f'Awaiting {label} seated mesh and three-viewport acceptance.'],method='Visible final-map bank, local road-medial similarity registration; no road or active-region intersection. Other withheld source candidates remain independently unresolved.')
if previous.get('zone'):
 prior=copy.deepcopy(previous['zone']);current=copy.deepcopy(zone)
 for z in [prior,current]:
  z.pop('availability',None);z.pop('geometryReview',None)
 if prior==current:zone['availability']=previous['zone']['availability'];zone['geometryReview']=previous['zone']['geometryReview']
record=dict(circuitId='madrid',season=2026,sourceUrl=url,sourceSha256=hashlib.sha256(image.read_bytes()).hexdigest(),sourceBoundaryPixels=pixels.tolist(),roadControlPixels=controls.tolist(),roadControlNumbers=numbers,fitRmsMetres=float(np.sqrt(np.mean(np.sum((controls@rotation*scale+translation-target)**2,axis=1)))),scaleMetresPerPixel=float(scale),rotation=rotation.tolist(),translation=translation.tolist(),geometryFingerprint=hashlib.sha256(json.dumps({k:d[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),roadIntersectionMetres2=shape.intersection(road).area,roadClearanceMetres=shape.distance(road),withheldConflicts=conflicts,estimatedSection=dict(depthMetres=depth,rowPitchMetres=.85,rowRiseMetres=.4,rows=rows,riseMetres=rise),oldZone=old,zone=zone,limitation='Internal registration residual is not surveyed accuracy. Corner controls and bank divider are approximate; site obstructions and all-seat visibility remain unverified.')
if previous.get('zone')==zone and previous.get('sceneAcceptance'):record['sceneAcceptance']=previous['sceneAcceptance']
out.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(label+' depth',round(depth,2),'rows',rows,'rise',rise,'road clearance',round(record['roadClearanceMetres'],3),'inactive conflicts',conflicts)
