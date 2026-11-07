import copy,json,math,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString,Point
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/mexico.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(p/sc+o).tolist()
poly=lambda b:Polygon([xy(p) for p in b])
road=LineString([xy(p) for p in d['trackGeometry']['coordinates']]);c=next(c['coordinate'] for c in d['corners'] if c['number']==3)
s=road.project(Point(xy(c)))+150;a=np.array(road.interpolate(s).coords[0]);t=np.array(road.interpolate(s+1).coords[0])-np.array(road.interpolate(s-1).coords[0]);t/=np.linalg.norm(t);n=np.array([-t[1],t[0]])
b=[ll(a+t*x+n*y) for x,y in [(-12.5,18),(12.5,18),(12.5,26),(-12.5,26),(-12.5,18)]]
p=poly(b);f=read('src/circuits/facilities/mexico.json')
obs=[poly(s['boundary']) for z in d['spectatorZones'] for s in z['surfaces']]+[poly(b['boundary']) for b in f['buildings']]+[LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2) for l in f['pitLanes']]
assert all(p.intersection(other).area<.1 for other in obs),'Source association conflicts; do not translate merely for clearance'
src=dict(url='https://mexicogp.s3.us-west-2.amazonaws.com/wp-content/uploads/2016/01/09081135/accesible-azul.png',checkedAt='2026-11-06',method='estimated',confidence='low',notes='Organizer accessible-blue locator marks a separate small platform on the outside/left of the back straight afterT3, between theT3 seating and6A. Approximate25x8m level platform150m afterT3,18–26m driver-left, floor0.2m estimate, seated eye1.2m. Diagram upload year is not annual identity proof; separate2026 sale table names ZonaAccesible.')
z=dict(zoneId='zona-accesible-azul',name='Zona Accesible Azul',kind='grandstand',availability='available',boundary=b,supportToTerrain=True,
 surfaces=[dict(surfaceId='zona-accesible-azul-1',boundary=b,baseHeight=.2,rise=0,eyeHeight=1.2,rows=1,frontReference=ll(a))],surface=dict(baseHeight=.2,rise=0,eyeHeight=1.2,depth=8),source=src,surfaceSource=copy.deepcopy(src),
 openingSource=dict(url='https://www.mexicogp.mx/mediacenter/arranca-la-cuenta-regresiva-para-el-mexico-gp-2026/',checkedAt='2026-11-06',method='published',confidence='high',notes='Primary annual2026 sale table explicitly lists ZonaAccesible for persons with disabilities; product page separately identifies blue platform and restricts use to eligible persons, tickets not transferable. Do not interpret ordinary BoletosGenerales as standing GA.'),
 admissionNote='无障碍专属区域，需符合官方入场资格，票不可转让；范围与平台高度为近似。',description='T3之后蓝区的近似平层平台，坐姿眼高1.2米，保留几何遮挡。',geometryReview=dict(checkedAt='2026-11-06',issues=[],method='Explicit source-associated approximate platform; registered neighboring seats/facilities screened.'))
r=dict(circuitId='mexico',season=2026,zones=[z],beforeZones=[],sourceMapSha256=hashlib.sha256((ROOT/'research/season-review/mexico-2026/accesible-azul-locator.png').read_bytes()).hexdigest(),coverage='Separate source-associated accessible blue viewing platform; exact installation footprint and detailed ramps unverified.')
p=ROOT/'src/circuits/americas/mexico-accessible-2026.json';assert not p.exists();p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
