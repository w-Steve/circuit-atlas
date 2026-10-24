"""Build C-group views from explicit OSM allowlists and documented diagram picks.
No automatic stand placement/translation. Failed polygons remain withheld.
Reference artwork is research only; coordinates and assumptions are reproducible.
"""
import json,math,re,subprocess,sys
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,box
root=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text(encoding='utf8'))
sources={
 'miami':'https://f1miamigp.com/news/press-release/tickets-on-sale-now-for-the-return-of-formula-1-to-miami-in-2026/',
 'montreal':'https://gpcanada.ca/wp-content/uploads/2026/05/guide-du-visiteur-2026-en-1.pdf',
 'austin':'https://help.thecircuit.com/hc/en-us/articles/40009157954324-Grandstand-Seating',
 'mexico':'https://www.mexicogp.mx/boletos-generales/',
 'interlagos':'https://f1saopaulo.com.br/arquibancadas/',
 'las-vegas':'https://www.f1lasvegasgp.com/tickets/grandstands/'}
def source(url,method,confidence,notes):return dict(url=url,checkedAt='2026-10-23',method=method,confidence=confidence,notes=notes)
osm={
 'montreal':{'Grandstand 11':[1243714699],'Grandstand 12':[1381122382],'Grandstand 15':[1243714698],'Lance Stroll 24':[1243714697],'Grandstand 46':[1243714696]},
 'austin':{'Main':[460658889],'Turn 1':[460658890],'Turn 15 North':[460658891],'Turn 15 South':[460658892],'Turn 12':[460683347,1183793500],'Turn 19':[1183793497]},
 'mexico':{'Grada 1':[377679571],'Grada 2':[377679572],'Grada 2A':[1212660336,1212660337],'Grada 3A':[1191967004],'Grada 4':[605366589],'Grada 5':[605366588],'Grada 5A':[1191525031],'Grada 6':[605366586],'Grada 6B':[1162963329],'Grada 14 Sur':[1315400018],'Grada 15 Norte':[377679562]},
 'interlagos':{'Setor M':[138420844],'Setor B':[138420848],'Pit Stop Club':[138550780],'Setor A':[189535474]}}
# Source pixel coordinates. Each local two-corner transform preserves bearings,
# with an explicit limited lateral schematic scale (not surveyed dimensions).
# Families split at visibly different faces retain descriptive suffixes, not
# invented ticket blocks. No Turn 1 East in Miami: not offered in 2026.
diagrams={
 'miami':dict(url='https://s40320.pcdn.co/wp-content/uploads/2025/10/F1_-Interactive-Map_Updated_Discovery_2-scaled-e1779901726996.jpg',year='undated current organizer diagram; 2026 names checked separately',
 controls={1:[1300,445],2:[1270,492],3:[1209,652],6:[490,537],7:[263,602],8:[278,704],11:[1848,500],12:[1774,393],17:[426,164],18:[556,251],19:[723,185]},
 rectangles=[('Start Finish',1065,251,308,35,29,19,1),('Turn 1 North',1329,398,172,28,29,19,1),('Turn 18 West',452,282,149,27,31,17,18),('Turn 18 East',610,319,147,27,-7,18,19),('Marina North',179,519,72,30,30,6,7),('Marina Central',152,601,72,30,90,7,8),('Marina South',173,690,73,30,70,7,8),('North Beach West',1729,416,161,26,90,11,12),('North Beach Crest',1800,304,130,25,-4,11,12),('South Beach',1861,577,134,28,-30,11,12)]),
 'montreal':dict(url='https://raceexperiences.com/wp-content/uploads/2026/04/F1-Ticket-tips-Canada.pdf',year=2026,
 controls={1:[940,1002],2:[976,1013],3:[857,1080],4:[830,1087],5:[747,1092],6:[650,1048],7:[616,1081],8:[414,938],9:[424,911],10:[229,759],11:[258,767],12:[402,790],13:[692,885],14:[697,907]},
 rectangles=[('Grandstand 1',796,952,87,18,17,14,1),('Grandstand 16',752,938,84,18,17,14,1),('Platine',918,1018,54,18,40,1,2),('Grandstand 10',940,1076,66,18,-32,2,3),('Grandstand 21',248,787,87,20,18,10,9),('Grandstand 34',322,785,18,18,15,10,12),('Grandstand 47',348,791,61,18,10,10,12),('Grandstand 31',407,928,47,18,-72,8,9),('Grandstand 32',671,1043,49,17,17,6,7),('Grandstand 33',625,1054,54,18,-60,6,7)]),
 'austin':dict(url='https://f1destinations.com/wp-content/uploads/2025/10/2025-United-States-GP-COTA-Spectator-Map.pdf',year=2025,
 controls={3:[797,578],4:[849,514],5:[870,473],9:[1114,449],10:[1264,429]},
 rectangles=[('Turn 4',868,542,73,23,-51,3,4),('Turn 9',1193,472,89,23,-11,9,10)]),
 # Isometric sector map used only for named location matching; temporary
 # boundaries below use explicit geographic picks against the OSM track.
 'las-vegas':dict(url='https://www.f1lasvegasgp.com/app/uploads/2026/07/Website-Maps_2_MAINGRANDSTAND-1-scaled.jpg',year=2026,
 controls={1:[1371,144],2:[1340,185],3:[1396,300],4:[1374,365],5:[750,379],6:[721,219],7:[638,139],8:[615,151],9:[505,157],10:[466,493],16:[1589,860],17:[1573,350]},
 rectangles=[('Main',1496,181,183,24,42,1,17),('Turn 3',1418,350,47,20,-57,3,4),('Heineken West',1141,418,135,30,0,4,5),('Heineken East',1294,418,87,30,0,4,5),('Lewis Hamilton',1548,422,61,23,90,17,16),('T-Mobile Turn 5',777,301,111,23,90,5,6),('T-Mobile Turn 6',698,123,43,21,29,6,7),('T-Mobile Turn 7',660,112,37,21,10,6,7),('T-Mobile Turn 8',612,115,47,18,0,7,8),('T-Mobile Turn 9',570,130,34,22,90,8,9)])}

def rectangle(x,y,w,d,angle):
 a=math.radians(angle);u=np.array([math.cos(a),math.sin(a)]);v=np.array([-u[1],u[0]]);c=np.array([x,y]);return np.array([c+u*i*w/2+v*j*d/2 for i,j in [(-1,-1),(1,-1),(1,1),(-1,1),(-1,-1)]])
review={}
for cid,url in sources.items():
 data=read(f'src/circuits/generated/{cid}.json');origin=np.array(data['trackGeometry']['coordinates'][0]);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320]);zones=[]
 ways={w['id']:w for w in read(f'src/circuits/americas/osm/{cid}-osm.json')['elements']}
 def add(name,boundaries,provenance):
  zid=re.sub('[^a-z0-9]+','-',name.lower()).strip('-');surfaces=[];depths=[]
  for i,b in enumerate(boundaries):
   p=(np.array(b)[:-1]-origin)*factor;a=p-p.mean(0);_,v=np.linalg.eigh(a.T@a);depth=float(np.ptp(a@v[:,0]));depths.append(depth);rise=round(min(16,max(2,depth*.45)),2)
   surfaces.append(dict(surfaceId=f'{zid}-{i+1}',boundary=b,baseHeight=2.2,rise=rise,eyeHeight=1.2,rows=max(5,round(rise/.5))))
  zones.append(dict(zoneId=zid,name=name,kind='grandstand',availability='preparing',supportToTerrain=True,boundary=boundaries[0],surfaces=surfaces,surface=dict(baseHeight=2.2,rise=surfaces[0]['rise'],depth=round(depths[0],2),eyeHeight=1.2),source=provenance,
   openingSource=source(url,'estimated','medium','2026公开票区名称核对，不表示实时售票/余票；分面后缀为模型方位，不是座位分区。'),
   surfaceSource=source(url,'estimated','low','座席带、高度、坡度、阶梯行数和围网均为估计；不能保证真实座位的遮挡和距离。')))
 for name,ids in osm.get(cid,{}).items():
  boundaries=[[[p['lon'],p['lat']] for p in ways[wid]['geometry']] for wid in ids]
  notes='OSM看台建筑与公开场馆图匹配；way/'+','.join(map(str,ids))+'。非座椅测绘/票务边界。'
  if cid=='mexico' and name in ['Grada 14 Sur','Grada 15 Norte']:
   # Split the original L-shaped stadium building within its unchanged footprint.
   # A single PCA slope would wrongly face part of each seating wing sideways.
   cut=-203 if name=='Grada 14 Sur' else -190
   poly=Polygon((np.array(boundaries[0])-origin)*factor)
   parts=[poly.intersection(box(-1000,-1000,cut,1000)),poly.intersection(box(cut,-1000,1000,1000))]
   assert all(p.geom_type=='Polygon' and not p.is_empty for p in parts)
   assert abs(sum(p.area for p in parts)-poly.area)<1e-5
   boundaries=[(origin+np.array(p.exterior.coords)/factor).tolist() for p in parts]
   notes+=' L形建筑在原轮廓内分为两个座席坡向，分割线为示意，不是票务分区。'
  add(name,boundaries,source(f'https://www.openstreetmap.org/way/{ids[0]}','extracted','medium',notes))
 if cid=='interlagos':
  # Explicit approximate GIS picks matched to the organizer's isometric sector
  # diagram. These are NOT surveyed polygons; no algorithm places them at bends.
  for name,x,z,w,d,angle in [('Setor D',60,320,90,22,60),('Setor H',220,309,93,22,0),('Setor R',484,205,101,23,-65),('Setor G',618,-80,278,22,-70)]:
   boundary=(origin+rectangle(x,z,w,d,angle)/factor).tolist()
   add(name,[boundary],source('https://f1saopaulo.com.br/wp-content/uploads/2026/08/Mapa-completo.webp','estimated','low','主办方2026区位示意图对应OSM线路，人工估计地理位置和边界；等距图不能量取精确尺寸，中心/尺寸参数记录于生成器，误差可能达数十米。'))
 if cid in diagrams:
  config=diagrams[cid];controls=config['controls'];corners={c['number']:c['coordinate'] for c in data['corners']}
  for name,x,y,w,depth,angle,ca,cb in config['rectangles']:
   a,b=np.array(controls[ca]),np.array(controls[cb]);u=(b-a)/np.linalg.norm(b-a);n=np.array([-u[1],u[0]])
   ga,gb=(np.array(corners[ca])-origin)*factor,(np.array(corners[cb])-origin)*factor;gu=(gb-ga)/np.linalg.norm(gb-ga);gn=np.array([-gu[1],gu[0]])
   scale=np.linalg.norm(gb-ga)/np.linalg.norm(b-a);lateral=min(scale,1.4);local=rectangle(x,y,w,depth,angle)-a
   world=ga+(local@u)[:,None]*gu*scale+(local@n)[:,None]*gn*lateral;boundary=(origin+world/factor).tolist()
   notes=f'人工读取{config["year"]}图面位置；T{ca}/T{cb}局部两点配准，沿线{scale:.3f}m/px、横向{lateral:.3f}m/px。示意矩形非工程尺寸；可能有数十米误差。'
   if config['year']==2025:notes+=' 位置参照为2025图，2026票区名称另以主办方确认，不据此声称2026精确边界。'
   source_url=config['url']
   if cid=='las-vegas':
    if name.startswith('T-Mobile'):source_url='https://www.f1lasvegasgp.com/app/uploads/2026/03/TMOGRANDSTAND-1.png'
    elif name.startswith('Heineken'):source_url='https://www.f1lasvegasgp.com/app/uploads/2026/07/Website-Maps_WH-ZONE_HEINEKENGS-1-scaled.jpg'
    elif name=='Turn 3':source_url='https://www.f1lasvegasgp.com/app/uploads/2026/07/Website-Maps_2_TURN3GRANDSTAND-1-scaled.jpg'
    elif name=='Lewis Hamilton':source_url='https://www.f1lasvegasgp.com/app/uploads/2026/07/Website-Maps_WH-ZONE_Lewis-Hamilton-Grandstand-Package-2-scaled.jpg'
   add(name,[boundary],source(source_url,'estimated','low',notes))
 data['dataSources']=[s for s in data['dataSources'] if s.get('notes','')!='2026 spectator references; boundaries, heights and fences remain approximate.']+[source(url,'published','medium','2026 spectator references; boundaries, heights and fences remain approximate.')]
 data['spectatorZones']=zones;data['spectatorZoneIds']=[];data['simulationAvailability']='preparing'
 (root/f'src/circuits/generated/{cid}.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
 review[cid]=dict(openingReference=url,osm=osm.get(cid,{}),diagram=diagrams.get(cid),candidateZones=len(zones),notes='Interlagos temporary sector GIS picks are explicit in build-americas-spectators.py; no automatic shifts or surveyed dimensions claimed.' if cid=='interlagos' else '')
(root/'src/circuits/americas/review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf8')
subprocess.run(['node','node_modules/vite-node/vite-node.mjs','scripts/export-spectator-audit.ts','americas'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/audit-europe-spectators.py','americas'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/constrain-spectator-footprints.py'],cwd=root,check=True)
