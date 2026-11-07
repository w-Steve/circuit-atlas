"""Build B-group spectator packages from allowlisted OSM and traced diagram facts.
No map artwork is distributed. Temporary footprints and every seating height
remain estimates. Run the shared road/face audit before exposing any surface.
"""
import json,math,re,subprocess,sys
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon

root=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text(encoding='utf8'))
sources={
 'melbourne':'https://www.grandprix.com.au/uploads/images/F126_009_Visitor-Map_A3_V9-Digi-3.pdf',
 'suzuka':'https://www.suzukacircuit.jp/eng/f1/ticket/',
 'baku':'https://www.bakucitycircuit.com/buy-now',
 'sepang':'https://www.bahraingp.com/blog/events/event-overview-2026/',
 'singapore':'https://singaporegp.sg/en/tickets/general-tickets/grandstands/saturday/',
 'lusail':'https://www.lcsc.qa/faq/formula-1r-qatar-airways-qatar-grand-prix-2026',
 'yas-marina':'https://www.abudhabigp.com/en/formula1/tickets-2026'}
def source(url,method,confidence,notes):return dict(url=url,checkedAt='2026-10-23',method=method,confidence=confidence,notes=notes)
osm={
 'suzuka':{'V1':[184107052],'V2':[183394522],'A1':[184120096],'B1':[184143131],'B2':[184143132],'C':[184143133],'D1–D4':[469368057],'D5':[469395390],'E':[467982372],'G':[184102012,184102013,184102361,184102368],'L':[184104828],'M':[183953761],'N':[183953758],'O':[184415310],'P':[184419745],'Q1':[183393132],'Q2':[183393101,183393102,183393103],'R':[183393129]},
 'sepang':{'K1':[107364100],'F':[107364038]},
 'lusail':{'Main':[152483596],'North':[1567982803],'T3':[1316027537],'T16':[1568200891]},
 'yas-marina':{'Main':[188731381],'South':[133907081]},
}
# Two-corner local similarities preserve angles: unlike a three-control affine,
# they cannot collapse or shear a stand. Each explicit rectangle is traced from
# the reference, not generated around every corner. Source diagrams are not GIS.
diagrams={
 'melbourne':dict(url='https://oversteer48.com/wp-content/uploads/2023/12/Australian-Grand-Prix-Grandstand-map-2026.jpg',year=2026,
  controls={1:[498,618],2:[466,574],3:[141,525],4:[174,458],5:[90,379],6:[151,151],7:[201,147],8:[291,88],9:[780,388],10:[812,348],11:[1160,431],12:[1109,560],13:[966,541],14:[960,625]},
  rectangles=[('Fangio',779,674,132,25,0,1,14),('Piastri',673,674,68,25,0,1,14),('Jones',465,666,86,26,0,1,14),('Moss',541,665,52,21,0,1,14),('Brabham',523,565,70,24,45,1,2),('Hill',88,516,42,17,-46,3,4),('Ricciardo',201,494,55,22,-59,3,4),('American Express',129,476,42,20,-44,3,4),('Stewart',68,254,54,19,-70,5,6),('Button',291,53,52,19,0,7,8),('Clark',480,164,56,22,66,8,9),('Waite',785,315,67,23,-45,9,10),('Vettel',1138,368,56,20,27,10,11),('Webber',1103,456,43,15,-76,11,12),('Schumacher',1003,596,44,16,-84,13,14),('Lauda',1145,620,59,20,-56,12,13),('Senna',895,670,59,21,0,1,14),('Prost',978,655,57,24,-30,13,14)]),
 'baku':dict(url='https://f1destinations.com/wp-content/uploads/2025/09/2025_F1-Wayfinding-Map_Positive_Azerbaijan_VISUAL.pdf',year=2025,
  controls={1:[1360,329],2:[1357,143],3:[864,143],4:[864,277],5:[672,277],6:[672,327],7:[455,380],8:[455,278],9:[440,271],10:[438,252],11:[408,246],12:[409,205],13:[207,210],14:[103,325],15:[67,427],16:[195,576],17:[300,510],18:[443,454],19:[477,389],20:[735,335]},
  rectangles=[('Absheron A',1173,361,34,18,0,1,20),('Absheron B',1209,361,34,18,0,1,20),('Absheron C',1246,361,34,18,0,1,20),('Absheron D',1283,361,34,18,0,1,20),('Absheron E',1320,361,34,18,0,1,20),('Bulvar',691,365,29,17,-6,19,20),('Azneft',232,594,35,18,-38,16,17),('Khazar',717,325,36,18,-4,19,20),('Sahil',657,368,27,17,-8,19,20),('Mugham',502,409,41,18,-16,18,19)]),
 'singapore':dict(url='https://storage.singaporegp.sg/web/2026/circuit-park-map/circuit-park-map.pdf?1015=',year=2027,
  controls={1:[1338,541],2:[1285,499],3:[1265,447],4:[1209,514],5:[1114,732],6:[804,533],7:[649,278],8:[488,352],9:[438,203],10:[128,369],11:[161,477],12:[139,538],13:[180,690],14:[494,382],15:[580,578],16:[904,809],17:[896,851],18:[1094,991],19:[1167,956]},
  rectangles=[('Pit',1257,759,206,17,-67,19,1),('Turn 1',1353,537,60,18,-67,19,1),('Turn 2',1348,493,57,19,21,1,2),('Padang',236,337,75,26,-30,9,10),('Stamford',567,275,67,24,-27,7,8),('Connaught',432,411,94,13,-43,13,14),('Empress',123,518,59,14,-76,11,12),('Bayfront',960,900,57,13,33,17,18),('Promenade',1002,936,75,13,33,17,18),('Skyline',1081,962,55,14,-29,18,19)])
}

def rectangle(x,y,w,d,angle):
 a=math.radians(angle);u=np.array([math.cos(a),math.sin(a)]);v=np.array([-u[1],u[0]]);c=np.array([x,y])
 p=[c+u*i*w/2+v*j*d/2 for i,j in [(-1,-1),(1,-1),(1,1),(-1,1),(-1,-1)]]
 return np.array(p)
review={}
for cid,url in sources.items():
 data=read(f'src/circuits/generated/{cid}.json');origin=np.array(data['trackGeometry']['coordinates'][0]);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320]);zones=[]
 ways={w['id']:w for w in read(f'src/circuits/asia/osm/{cid}-osm.json')['elements']}
 def add(name,boundaries,provenance,kind='grandstand'):
  zid=re.sub('[^a-z0-9]+','-',name.lower()).strip('-');surfaces=[];depths=[]
  for i,b in enumerate(boundaries):
   p=(np.array(b)[:-1]-origin)*factor;a=p-p.mean(0);_,v=np.linalg.eigh(a.T@a);depth=float(np.ptp(a@v[:,0]));depths.append(depth)
   rise=round(min(16,max(2,depth*.45)),2)
   surfaces.append(dict(surfaceId=f'{zid}-{i+1}',boundary=b,baseHeight=2.2,rise=rise,eyeHeight=1.2,rows=max(5,round(rise/.5))))
  zones.append(dict(zoneId=zid,name=name,kind=kind,availability='preparing',supportToTerrain=True,boundary=boundaries[0],surfaces=surfaces,
   surface=dict(baseHeight=2.2,rise=surfaces[0]['rise'],depth=round(depths[0],2),eyeHeight=1.2),source=provenance,
   openingSource=source(url,'estimated','medium','2026公开场馆/票区名称交叉核对；不表示实时售票状态。图面细分不等于逐票区或座位复原。'),
   surfaceSource=source(url,'estimated','low','看台高度、阶梯坡度、围网与有效座席边界为简化估计；OSM建筑不等于座椅测绘，地形DEM不能分辨座席。')))
  if cid=='sepang':
   inventory=read('src/circuits/season-review/sepang-public-inventory.json')
   zones[-1]['openingSource']=inventory['openingSource'].copy()
   zones[-1]['surfaceSource']['url']=inventory['openingSource']['url']
   zones[-1]['surfaceSource']['notes']='现有看台高度、阶梯坡度与座席切分仍为估计；年度票务页不提供实测断面。'
 for name,ids in osm.get(cid,{}).items():
  boundaries=[[[p['lon'],p['lat']] for p in ways[wid]['geometry']] for wid in ids]
  add(name,boundaries,source(f'https://www.openstreetmap.org/way/{ids[0]}','extracted','medium','具名/对照场馆图确认的OSM看台建筑轮廓；way/'+','.join(map(str,ids))+'。非精确售票边界。'))
 if cid=='suzuka':
  # Other unnamed OSM bleachers are not silently assigned an F1 ticket name.
  pass
 if cid=='sepang':
  w=ways[144247993];p=(np.array([[q['lon'],q['lat']] for q in w['geometry']])-origin)*factor
  # Separate the two long seating faces from the mall/circulation corridor and
  # circular tower. Explicit linear clips lie within the source building only.
  for name,clip in [('Main North',[[-20,14],[550,-34],[550,-13],[-20,36],[-20,14]]),('Main South',[[-20,104],[570,-3],[570,25],[-20,131],[-20,104]])]:
   shape=Polygon(p).intersection(Polygon(clip))
   if shape.is_empty:raise ValueError(name)
   b=(origin+np.array(shape.exterior.coords)/factor).tolist()
   add(name,[b],source('https://www.openstreetmap.org/way/144247993','extracted','medium','OSM主看台建筑内的两侧长座席带；中央商场/通道与端部塔楼未作为连续座席。边带切分为示意，非逐层/逐座测绘。'))
 if cid=='yas-marina':
  w=ways[168411369];poly=Polygon((np.array([[q['lon'],q['lat']] for q in w['geometry']])-origin)*factor)
  for name,clip in [('North West',[[-200,-1010],[0,-1010],[0,-800],[-200,-800],[-200,-1010]]),('North Crown',[[-200,-1200],[200,-1200],[200,-1010],[-200,-1010],[-200,-1200]]),('North East',[[0,-1010],[200,-1010],[200,-800],[0,-800],[0,-1010]])]:
   shape=poly.intersection(Polygon(clip))
   if shape.is_empty:continue
   if shape.geom_type=='MultiPolygon':parts=list(shape.geoms)
   else:parts=[shape]
   b=[(origin+np.array(part.exterior.coords)/factor).tolist() for part in parts]
   add(name,b,source('https://www.openstreetmap.org/way/168411369','extracted','medium','北看台U形建筑分为西侧/弯顶/东侧，分别确定座席正面，避免整座U形看台使用同一坡向。分割界线为模型示意，不代表票区边界。'))
 if cid in diagrams:
  config=diagrams[cid];controls=config['controls'];corners={c['number']:c['coordinate'] for c in data['corners']}
  for name,x,y,w,depth,angle,ca,cb in config['rectangles']:
   a,b=np.array(controls[ca]),np.array(controls[cb]);u=(b-a)/np.linalg.norm(b-a);n=np.array([-u[1],u[0]])
   ga,gb=(np.array(corners[ca])-origin)*factor,(np.array(corners[cb])-origin)*factor;gu=(gb-ga)/np.linalg.norm(gb-ga);gn=np.array([-gu[1],gu[0]])
   scale=np.linalg.norm(gb-ga)/np.linalg.norm(b-a)
   # Explicit lateral schematic scale keeps inflated diagram spacing from
   # turning into a fictitious 100m-deep stand; all choices remain recorded.
   lateral=min(scale,1.4)
   overrides=read('src/circuits/asia/diagram-footprints.json').get(cid,{})
   rect=np.array(overrides[name]) if name in overrides else rectangle(x,y,w,depth,angle)
   local=rect-a
   world=ga+(local@u)[:,None]*gu*scale+(local@n)[:,None]*gn*lateral
   boundary=(origin+world/factor).tolist()
   notes=f'人工读取{config["year"]}图中已知看台位置；以T{ca}/T{cb}作局部两点配准，保持线路分支；横向示意比例{lateral:.3f}m/px，纵向{scale:.3f}m/px。临时看台边界存在数十米误差，不用于具体座位保证。'
   if config['year']!=2026:notes+=' 位置图为相邻年份资料，2026名称另行核对；不据此声称当年精确边界或全部票区开放。'
   add(name,[boundary],source(config['url'],'estimated','low',notes))
 if cid=='lusail':
  # Preserve independently reviewed physical seating; the older unnamed-way
  # association and schematic footprints must not silently restore themselves.
  import importlib.util
  spec=importlib.util.spec_from_file_location('lusail_seating',root/'scripts/apply-lusail-seating.py')
  seating=importlib.util.module_from_spec(spec);spec.loader.exec_module(seating)
  accepted=seating.reviewed_zones(data,read('src/circuits/asia/lusail-t2-t3-2026.json'))
  accepted_ids={z['zoneId'] for z in accepted}
  zones=[z for z in zones if z['zoneId'] not in accepted_ids]+accepted
 data['spectatorZones']=zones;data['spectatorZoneIds']=[];data['simulationAvailability']='preparing'
 (root/f'src/circuits/generated/{cid}.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
 review[cid]=dict(openingReference=url,osm=osm.get(cid,{}),diagram=diagrams.get(cid),candidateZones=len(zones))
(root/'src/circuits/asia/review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf8')
subprocess.run([sys.executable,'scripts/apply-suzuka-supplement.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-spectator-datums.py'],cwd=root,check=True)
subprocess.run(['node','node_modules/vite-node/vite-node.mjs','scripts/export-spectator-audit.ts','asia'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/audit-europe-spectators.py','asia'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-yas-main.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-singapore-connaught-hold.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-singapore-turn1.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-singapore-republic.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-singapore-raffles.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-singapore-pit-exit.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-singapore-marina-bay.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-singapore-chicane-turn-2.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-singapore-walkabout-padang.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-singapore-walkabout-platforms.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-singapore-walkabout-premier.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-yas-hill.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-yas-marina-stand.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/apply-yas-west-straight.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-yas-north-straight.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-yas-west-grandstand.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-baku-khazar.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-lusail-supplement.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-singapore-extra-platforms.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-singapore-zone4-extra.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-baku-public.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-sepang-hillstands.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-singapore-remaining-platforms.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-singapore-platform-closure.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-baku-c-tiers.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-singapore-padang-ab.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-singapore-super-pit.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-singapore-accessible.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-yas-west-pavilion.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-singapore-chicane-turn-1.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-suzuka-annual-supplement.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)
