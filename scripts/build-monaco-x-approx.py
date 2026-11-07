"""Interpret two named start-straight sectors; dimensions are author estimates."""
import json,copy,math
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString,Point
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
g=read('src/circuits/generated/monaco.json')
o=np.array(g['trackGeometry']['coordinates'][0][:2])
sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(p/sc+o).tolist()
road=LineString([xy(p) for p in g['trackGeometry']['coordinates']])
url='https://grandprixexperience.com/f1-race/monaco/race-tickets/'
r={'circuitId':'monaco','season':2026,'zones':[],'beforeZones':[],
 'annualEvidence':{'url':url,'checkedAt':'2026-11-06','header':'Monaco Grand Prix 2026 RACE TICKETS',
 'products':['Grandstand X1','Grandstand X2'],'scope':'Retrieved supplier body lists separate reserved-seat products; no surveyed access polygons or live-stock claim.'}}
for zid in ['x1-quai-albert','x2-quai-albert']:
 old=next(z for z in g['spectatorZones'] if z['zoneId']==zid)
 assert old['availability']=='preparing','Do not overwrite an accepted bank'
 r['beforeZones'].append(copy.deepcopy(old));z=copy.deepcopy(old)
 c=np.array(Polygon([xy(p) for p in old['boundary']]).centroid.coords[0])
 s=road.project(Point(c));a=np.array(road.interpolate(s).coords[0])
 t=np.array(road.interpolate(s+2).coords[0])-np.array(road.interpolate(s-2).coords[0]);t/=np.linalg.norm(t)
 n=np.array([-t[1],t[0]]);n*=1 if n[0]<0 else -1
 front=[ll(a+n*12-t*9),ll(a+n*12+t*9)]
 back=[ll(a+n*22-t*9),ll(a+n*22+t*9)]
 b=front+list(reversed(back))+[front[0]]
 z.update(boundary=b,availability='available')
 sf=z['surfaces'][0]
 sf.update(boundary=b,baseHeight=2.2,rise=2,rows=5,frontReference=ll(a),rowBearing='local-normal',rowStrip={'front':front,'back':back,'source':copy.deepcopy(z['source'])})
 z['surface'].update(baseHeight=2.2,rise=2,depth=10)
 for src in [z['source'],z['surfaceSource'],sf['rowStrip']['source']]:
  src['checkedAt']='2026-11-06'
  src['notes']='2026 promoter map identifies X1/X2 outside start straight; retrieved2026 supplier lists both. Author approximate18x10m/5rows,base2.2m/rise2m,12m front offset from actual road. Not surveyed footprint or measured seats.'
 z['openingSource']={'url':url,'checkedAt':'2026-11-06','method':'published','confidence':'medium','notes':'Retrieved body explicitly labels2026Monaco race tickets and lists separate Grandstand X1/X2 reserved seats. Not precise access boundary or current availability.'}
 z['description']='发车直道外侧近似座席范围；排数及高度为估计。'
 z['geometryReview']={'checkedAt':'2026-11-06','issues':[],'method':'Annual named start-straight sector with explicit approximate road-facing bank.'}
 r['zones'].append(z)
p=ROOT/'src/circuits/europe/monaco-x-2026.json'
assert not p.exists(),'Preserve independent source review'
p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
