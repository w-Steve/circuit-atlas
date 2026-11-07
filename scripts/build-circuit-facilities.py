"""Extract explicitly reviewed pit facilities from retained public OSM geometry.

No selection by nearest building: international/national pits and adjacent venues
are explicitly distinguished. Heights and lane widths are approximate unless tagged.
Raw references stay in research; only selected footprints/tags and provenance ship.
"""
import json
import xml.etree.ElementTree as ET
import math
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
from pathlib import Path

root=Path(__file__).resolve().parents[1]
rows=json.loads((root/'artifacts/facility-source/selected-osm.json').read_text(encoding='utf-8'))
# Reviewed against the race track/corner/stand overlays and named facility tags.
# (building way IDs, pit road way IDs, fallback height in metres)
selection={
 'austin':([376713391],[514836373],14),
 'interlagos':([33779114],[33779109],14),
 'las-vegas':([1198427833],[1223479152],19.5),
 'mexico':([377679570],[638504647,772763791],12),
 'miami':([1017340353],[1017340352],10),
 'montreal':([42229671],[413000959],12),
 'baku':([822375068],[1513267145],10),
 'lusail':([152483597],[1037707300,196193732],15),
 'melbourne':([321789092,321789093,321789094,321789095,321789097],[],8),
 'sepang':([144362327],[23410526,144359483],14),
 'singapore':([49890775],[100484287],15),
 'suzuka':([184422099],[120917578],12),
 'yas-marina':([133907082],[176695254,176695255,176695253],16),
 'hungaroring':([123905481],[231417580],18),
 'madrid':([],[1552567031],12),
 'monaco':([],[850261588,1388331347],8),
 'monza':([34404652],[38168747],13),
 'silverstone':([227332429],[227902927],18),
 'spa':([77352246],[323851541],14),
 'zandvoort':([52473177],[38144527],11),
 'barcelona':([33742578],[33742214,178416729,178416733],12),
 'spielberg':([118364939],[289111668],13),
}
destination=root/'src/circuits/facilities'
destination.mkdir(exist_ok=True)
report=[]
for cid,(buildings,lanes,height) in selection.items():
 ways={w['id']:w for w in next(r for r in rows if r['id']==cid)['ways']}
 # Explicitly reviewed ways may not be in the old selected subset. Read their
 # original geometry from the retained OSM, never connect endpoints by a guess.
 for missing in set(buildings+lanes)-ways.keys():
  files=list((root/'research').glob(f'**/{cid}-osm.xml'))
  if not files:raise ValueError(f'Missing original OSM for {cid}/{missing}')
  osm=ET.parse(files[0]).getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in osm.findall('node')}
  w=next(w for w in osm.findall('way') if w.get('id')==str(missing))
  ways[missing]={'id':missing,'tags':{t.get('k'):t.get('v') for t in w.findall('tag')},'geometry':[nodes[n.get('ref')] for n in w.findall('nd')]}
 def source(w):
  return {'url':f'https://www.openstreetmap.org/way/{w["id"]}','checkedAt':'2026-10-23','method':'extracted','confidence':'medium','notes':'OSM 地理轮廓；与赛道、弯道和维修区位置对照。建筑立面为示意，非测绘复原。'}
 result={'circuitId':cid,'buildings':[],'pitLanes':[],'notes':'P 房边界来自 OSM；无高度标签时按场馆类型估算。维修通道宽度约 7 m，未核实车库数量或逐段宽度。'}
 for id in buildings:
  w=ways[id];g=w['geometry'];assert g[0]==g[-1] and len(g)>=4
  tagged=w['tags'].get('height');h=float(tagged) if tagged and tagged.replace('.','',1).isdigit() else height
  result['buildings'].append({'id':str(id),'name':'P 房 / 车库','boundary':g,'heightMetres':h,'heightEstimated':not bool(tagged),'source':source(w)})
 for id in lanes:
  w=ways[id];result['pitLanes'].append({'id':str(id),'coordinates':w['geometry'],'widthMetres':7,'underground':w['tags'].get('tunnel')=='yes','source':source(w)})
 # A nominal lane width must not extrude through the sourced garage wall.
 # Constrain the display width envelope, never move the original road centerline.
 if result['buildings']:
  origin=result['buildings'][0]['boundary'][0];sx=111320*math.cos(math.radians(origin[1]));sy=111320
  xy=lambda c:((c[0]-origin[0])*sx,(c[1]-origin[1])*sy)
  geo=lambda c:[c[0]/sx+origin[0],c[1]/sy+origin[1]]
  building_area=unary_union([Polygon([xy(c) for c in b['boundary']]) for b in result['buildings']])
  for lane in result['pitLanes']:
   if lane['underground']:continue
   line=LineString([xy(c) for c in lane['coordinates']]);envelope=line.buffer(lane['widthMetres']/2,cap_style=2,join_style=2)
   if envelope.intersection(building_area).area<.01:continue
   if line.intersection(building_area).length>.1:raise ValueError(f'{cid}: centerline crosses a garage; review source instead of masking it')
   fixed=envelope.difference(building_area.buffer(.15))
   pieces=[fixed] if fixed.geom_type=='Polygon' else list(fixed.geoms)
   lane['surfaceBoundary']=[[[geo(c) for c in ring.coords] for ring in [p.exterior,*p.interiors]] for p in pieces]
   lane['source']['notes']+=' Nominal 7m width envelope trimmed at sourced garage footprint with 0.15m display gap; original centerline unchanged. Width remains approximate.'
 if not buildings:result['notes']+=' 维修通道已定位，P 房关键轮廓尚未核实，不以邻近展馆或普通建筑冒充。'
 if cid=='silverstone':result['notes']+=' 使用 International pit lane 与 Silverstone Wing，不使用旧 National pits。'
 if cid=='melbourne':result['notes']+=' 使用 2026 比赛时的多用途旧维修楼，尚未套用后续重建方案；维修通道中心线仍待核实。'
 if cid=='lusail':result['notes']+=' 采用 F1 专用进站支路，不把 MotoGP 旧入口混入 F1。'
 if cid=='sepang':result['notes']+=' 2026 FIA 场地图核对：使用T15内侧进站 way23410526 接主维修通道 way144359483；不把南短赛道备用维修通道 way107364027 混入 F1。'
 if cid=='yas-marina':result['notes']+=' 地下出站段保留隧道属性，不绘成地表道路；地下净空与坡道高程未核实，暂不建模地下体积。'
 if cid=='silverstone':
  from uk_ea_elevation import OUT as ea_path,read as read_ea,configure_facilities
  if ea_path.exists():
   ea=read_ea(ea_path)
   if ea.get('runtimeApplied') and ea['sceneAcceptance'].get('accepted'):result=configure_facilities(result,ea)
 (destination/(cid+'.json')).write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
 report.append({'circuitId':cid,'buildingWays':buildings,'pitLaneWays':lanes,'buildingStatus':'approximate' if buildings else 'unverified','laneStatus':'approximate' if lanes else 'unverified'})
(root/'artifacts/local-polish').mkdir(parents=True,exist_ok=True)
(root/'artifacts/local-polish/facility-coverage.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(f'{len(selection)} circuit facility packages; {sum(bool(v[0]) for v in selection.values())} with reviewed building footprints')
