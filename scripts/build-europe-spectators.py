"""Build reviewed European spectator packages. Never infer a grandstand from a track name.
OSM footprints are allowlisted; temporary stands are manually digitized from organizer maps.
Rectangle vertices and slope estimates are schematic; original event images are not shipped.
"""
import json,math,re,unicodedata,hashlib
from pathlib import Path
import numpy as np
from scipy.spatial import Delaunay
root=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text(encoding='utf8'))
checked='2026-10-23'
sources={
 'monaco':'https://acm.mc/wp-content/uploads/2025/05/Hospitalites_ACM_F12026_F-3.pdf',
 'barcelona':'https://www.circuitcat.com/es/abonados-modalidades/',
 'spielberg':'https://www.redbullring.com/en/events-tickets/formula-1/glossary/',
 'silverstone':'https://www.silverstone.co.uk/news/silverstones-guide-grandstands',
 'spa':'https://www.spagrandprix.com/en/ticketing/access-tickets',
 'hungaroring':'https://homewww.gpticketshop.com/en/f1/hungarian-f1-grand-prix/pdfpricelist.html',
 'zandvoort':'https://www.dutchgp.com/app/uploads/2026/07/2026_F1_Netherlands_WayfindingMap_Negative_VISUAL.pdf',
 'monza':'https://www.monzanet.it/wp-content/uploads/2026/06/GP_F1_2026_LISTINO_PREZZI_6_17.pdf',
 'madrid':'https://www.madring.com/en/press-releases/mobility-plan'}
def source(url,method,confidence,notes):return dict(url=url,checkedAt=checked,method=method,confidence=confidence,notes=notes)
def rect(x,y,w,d,angle=0):
 a=math.radians(angle);u=np.array([math.cos(a),math.sin(a)]);v=np.array([-u[1],u[0]]);c=np.array([x,y])
 return [(c+u*i*w/2+v*j*d/2).tolist() for i,j in [(-1,-1),(1,-1),(1,1),(-1,1),(-1,-1)]]
# Explicit reviewed OSM footprint families, not every structure inside a circuit bbox.
osm={
 'barcelona':{'Principal':[33742643],'A':[1427281575],'B':[33744188,152007366,152007371],'C':[152007375,152007378],'E':[151594582],'F':[151594584],'G':[152007381],'H':[725695175],'J':[151594586],'K':[151594579],'L':[235224640],'M':[235224642],'N':[152015333],'T1':[1427279730],'T10':[151609927]},
 'spielberg':{'Start / Ziel':[312030921],'Steiermark':[312030917],'Red Bull':[118364945,604402038],'Nord / T4':[565072384],'Mitte':[1077517159],'Ost / T8':[1077423719],'T10':[1077423720]},
 'silverstone':{'Copse A':[227342440],'Copse B':[227342441],'Copse C':[227342444],'Copse D':[1560504713],'Becketts':[227342446],'Village B':[227342447],'Farm Curve':[227342449],'Woodcote A':[227342450],'Woodcote B':[227342459],'National Pit Straight':[227342452],'Luffield':[227342456],'Abbey A':[227342458],'Hamilton Straight A':[1387956625],'Chapel':[1430486596],'Luffield Corner':[1560504709],'Stirling A':[1560504712],'Stirling B':[1560504711]},
 'spa':{'Gold 1 · Pit':[174882363],'Gold 2 · GP2':[1353159436],'Gold 3 · Raidillon':[1134053908],'Silver 1 · Francorchamps':[1353159437]},
 'hungaroring':{'Hungaroring':[230979479],'T1':[230979487],'Grand Prix 1':[230979489],'Grand Prix 2':[230979482],'Apex 1':[230979493],'Apex 2':[230979476],'Grid 1':[1085151668],'Grid 2':[1085151669],'Grid 3':[230979498],'Pit Exit 1':[658606806],'Pit Exit 2':[1412550387],'Podium':[1085151661],'Chicane 1':[231059800],'Chicane 2':[231059801],'Chicane 3':[231059802]},
 'zandvoort':{'Main Grandstand':[52473180]},
 'monza':{'Centrale':[193647796],'Laterale Sinistra':[193647795],'Laterale Destra':[34404645],'Alta Velocita':[231026018,231026024,231026025],'Prima Variante Esterna':[231026019],'Seconda Variante':[231265139],'Roggia':[231265140],'Ascari':[231260684],'Ascari Uno':[194457685],'Ascari Due':[194457674],'Ascari Tre':[231026027],'Uscita Ascari A':[194457688],'Uscita Ascari B':[194457680],'Parabolica':[179794158],'Laterale Parabolica':[194457667,194457672,194457675,194457679,194457692],'Parabolica Interna':[194457681,194457691],'Vedano':[231026020],'Piscina':[231257063]},
}
# Geographic controls (track corners) are known GIS points; reference images are diagrammatic.
controls={
 'monaco':{1:[541,238],2:[735,374],3:[948,449],4:[984,362],5:[1178,326],6:[1170,420],7:[1188,380],8:[1244,409],9:[1046,541],10:[765,448],11:[733,438],12:[535,290],13:[449,379],14:[456,407],15:[392,478],16:[357,467],17:[315,587],18:[332,619],19:[272,594]},
 'zandvoort':{1:[1184,260],2:[1148,494],3:[1080,553],4:[1196,529],5:[1337,536],6:[1493,496],7:[1691,571],8:[1588,774],9:[1456,749],10:[1591,613],11:[1168,645],12:[1124,614],13:[1132,874],14:[940,820]},
 'madrid':{1:[187,423],2:[163,417],3:[155,366],4:[448,183],5:[574,211],6:[603,211],7:[756,159],8:[783,178],9:[828,158],10:[921,165],11:[954,203],12:[1103,222],13:[848,198],14:[778,259],15:[676,270],16:[653,388],17:[665,418],18:[561,491],19:[567,554],20:[385,625],22:[244,731]},
}
# Temporary footprint centers, dimensions and angle measured in each source diagram's pixels.
image_rects={
 'monaco':[
 ('A · Sainte Devote',538,260,32,13,0),('B · Casino',997,338,33,14,-5),
 ('K · Tabac',471,300,90,15,-36),('Z · Quai Kennedy',585,287,63,14,34),
 ('E · Chicane',422,398,18,11,35),('L · Piscine',375,454,32,16,35),('M · Piscine',459,412,50,14,-57),
 ('N · Piscine',433,457,32,13,-56),('O · Piscine',411,484,30,13,-57),('P · Piscine',398,509,35,14,-57),
 ('T · Rascasse',344,538,100,20,-77),('V · Anthony Noghes',268,607,33,16,28),('X1 · Quai Albert',279,540,30,14,-73),('X2 · Quai Albert',291,508,30,14,-73)],
 'zandvoort':[
 ('Tarzan-In',1117,294,52,17,-68),('Pit Grandstand',1076,407,120,17,-68),('Ben Pon',992,587,97,16,-69),
 ('Arena-Out',1106,791,54,14,80),('Arena Gold / Silver',1093,686,75,20,83),('Arena Gold / Silver Nord',1136,592,40,10,18),
 ('Arena-In',1233,607,75,17,-16),('Eastside 1',1336,624,60,17,-13),('Eastside 2',1280,650,70,15,-17),
 ('Eastside 3',1184,683,55,18,-25),('Eastside 4',1140,737,55,14,78),('Hairpin',1539,605,53,18,5),('Hairpin Sud',1540,649,53,18,-12)],
 'madrid':[
 ('主直道南段',213,662,90,18,80),('主直道中段',193,541,80,20,80),('主直道北段',180,455,57,20,80),
 ('T1–T3 看台',143,392,48,16,-80),('高速弯看台',269,270,150,20,-28),('T4–T5 看台',525,183,94,17,17),
 ('北区入口看台',689,214,115,18,-40),('北区组合弯看台',777,151,74,16,-23),('T9–T10 看台',874,151,78,17,7),
 ('T11 内侧看台',926,205,55,17,30),('Monumental 外侧看台',1107,228,100,20,85),('Monumental 内侧看台',1048,231,86,18,80),
 ('T13–T14 看台',807,239,75,19,-62),('T14–T15 看台',742,281,75,19,-7),('T15–T16 看台',680,347,99,20,93)],
}
# These metric controls were manually read against the GIS and organizer bend locations.
# They are deliberately labeled low confidence, not claimed as surveyed polygons.
world_rects={
 'silverstone':[
 ('Hamilton Straight B',-473,1020,105,24,-48),('Abbey B',-365,776,65,21,-48),('Village A',191,627,82,23,-37),
 ('The Loop',185,725,70,22,85),('Woodcote C',-284,40,65,20,-17),('Club Corner A',-546,1350,65,20,-55),
 ('Club Corner B',-498,1390,70,23,-30),('Club Corner C',-424,1396,70,23,5),('Vale',-369,1410,50,18,48),
 ('Landostand · Stowe',-134,1747,190,29,0),('Boxpark · Hangar',278,1406,100,20,-58)],
 'spielberg':[('T3',-860,-750,120,22,10)],
 'spa':[('Gold 7 · La Source',-160,-279,70,22,-7),('Gold 8 · Source Start',-101,-265,55,20,45),
 ('Gold 9 · Pole Position',-20,20,90,24,60),('Gold 6 · Chicane',119,258,77,24,18),
 ('Gold 11 · Chicane',74,320,70,24,0),('Silver 3 · Double Gauche',225,1430,100,20,-40),
 ('Silver 4 · Bruxelles',594,1720,80,20,45),('Combes',930,1460,95,24,80),('Speed Corner',252,1130,75,18,-40)]
}
(root/'src/circuits/europe').mkdir(exist_ok=True)
manifest={}
for id,url in sources.items():
 data=read(f'src/circuits/generated/{id}.json');ll=np.array(data['trackGeometry']['coordinates']);origin=ll[0];factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])
 zones=[];records=[]
 track=(ll-origin)*factor;segment=track[1:]-track[:-1];segmentLength=(segment*segment).sum(1)
 def nearest(p):
  t=np.clip(((p-track[:-1])*segment).sum(1)/segmentLength,0,1);q=track[:-1]+segment*t[:,None];return q[np.argmin(((q-p)**2).sum(1))]

 def add(name,boundaries,provenance):
  slug=re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',name).encode('ascii','ignore').decode().lower()).strip('-')
  zoneId=slug or 'stand-'+str(len(zones)+1)
  if any(z['zoneId']==zoneId for z in zones):zoneId+='-'+str(len(zones)+1)
  surfaces=[];depths=[]
  for i,b in enumerate(boundaries):
   pts=(np.array(b)-origin)*factor;center=pts[:-1].mean(0);a=pts[:-1]-center;_,vectors=np.linalg.eigh(a.T@a);depth=float(np.ptp(a@vectors[:,0]));depths.append(depth)
   rise=round(min(16,max(3,depth*.48)),2);base=2.2 if id not in ['monaco','madrid'] else 3.2
   surfaces.append(dict(surfaceId=f'{zoneId}-{i+1}',boundary=b,baseHeight=base,rise=rise,eyeHeight=1.2,rows=max(6,round(rise/.5))))
  z=dict(zoneId=zoneId,name=name,kind='grandstand',availability='preparing',boundary=boundaries[0],surface=dict(baseHeight=surfaces[0]['baseHeight'],rise=surfaces[0]['rise'],depth=round(depths[0],2),eyeHeight=1.2),surfaces=surfaces,source=provenance,openingSource=source(url,'estimated','medium','2026场馆看台资料与名称/位置匹配；多个分区可能合并为看台家族，不表示实时售票或每个座位均已还原'),surfaceSource=source(url,'estimated','low','高度、阶梯与围网为估计；按边界深度配置坡面，非现场测量。未还原屋顶、城市建筑或植被遮挡。'))
  zones.append(z)
 ways={e['id']:e for e in read(f'src/circuits/europe/osm/{id}-osm.json')['elements']}
 for name,ids in osm.get(id,{}).items():
  boundaries=[]
  for way in ids:
   pts=[[p['lon'],p['lat']] for p in ways[way]['geometry']]
   assert len(pts)>=4 and pts[0]==pts[-1],(id,name)
   boundaries.append(pts)
  add(name,boundaries,source(f'https://www.openstreetmap.org/way/{ids[0]}','extracted','medium','OSM建筑平面轮廓；way/'+','.join(map(str,ids))+'。位置未经现场测绘；看台售票分区可能与建筑边界不同。'))
 if id in controls:
  nums=list(controls[id]);pixels=np.array([controls[id][n] for n in nums]);corners={c['number']:c['coordinate'] for c in data['corners']};geo=(np.array([corners[n] for n in nums])-origin)*factor
  triangulation=Delaunay(pixels)
  def register(poly):
   # A single local affine per footprint avoids discontinuities within its surface.
   mid=np.array(poly[:-1]).mean(0);k=int(triangulation.find_simplex(mid))
   if k<0:k=int(np.argmin([np.linalg.norm(pixels[t].mean(0)-mid) for t in triangulation.simplices]))
   indices=triangulation.simplices[k];matrix=np.linalg.solve(np.c_[pixels[indices],np.ones(3)],geo[indices]);world=np.c_[poly,np.ones(len(poly))]@matrix
   return (origin+world/factor).tolist()
  for name,x,y,w,d,angle in image_rects.get(id,[]):
   boundary=register(rect(x,y,w,d,angle))
   add(name,[boundary],source(url,'estimated','low','2026主办方示意图人工选取边界，以弯道地理控制点作局部仿射配准；临时看台位置与尺寸为近似，不能用于具体座位购票。'))
   records.append(dict(name=name,pixelRectangle=[x,y,w,d,angle],worldOverride=None))
 for name,x,y,w,d,angle in world_rects.get(id,[]):
  boundary=(origin+np.array(rect(x,y,w,d,angle))/factor).tolist();add(name,[boundary],source(url,'estimated','low','根据主办方看台说明与GIS弯道相对关系人工估计平面边界；存在数十米位置误差，非测绘。'))
  records.append(dict(name=name,worldRectangle=[x,y,w,d,angle]))
 if id=='monaco':
  for bank in ['k','a','v','t']:
   reviewedPath=f'src/circuits/europe/monaco-{bank}-2026.json'
   if not (root/reviewedPath).exists():continue
   reviewed=read(reviewedPath)
   assert reviewed['circuitId']==data['circuitId']=='monaco' and reviewed['season']==data['season']==2026,'Monaco source season mismatch'
   fingerprint=hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
   assert fingerprint==reviewed['geometryFingerprint'],'Rebuild Monaco stand after road/terrain changes'
   assert reviewed['zone']['availability']=='available' and reviewed.get('sceneAcceptance',{}).get('accepted'),'Do not regenerate an unaccepted Monaco scene'
   slot=next(i for i,z in enumerate(zones) if z['zoneId']==reviewed['zone']['zoneId'])
   zones[slot]=reviewed['zone']
 if id=='madrid':
  for reviewedPath in ['src/circuits/europe/madrid-ga1-2026.json','src/circuits/europe/madrid-gb1-2026.json','src/circuits/europe/madrid-gb2-2026.json','src/circuits/europe/madrid-c-2026.json','src/circuits/europe/madrid-gc3-2026.json','src/circuits/europe/madrid-ge24-2026.json','src/circuits/europe/madrid-gk-2026.json','src/circuits/europe/madrid-ge1-2026.json','src/circuits/europe/madrid-ge7-2026.json','src/circuits/europe/madrid-inner-2026.json','src/circuits/europe/madrid-ge18-2026.json','src/circuits/europe/madrid-ge20-2026.json','src/circuits/europe/madrid-ge23-2026.json']:
   if not (root/reviewedPath).exists():continue
   reviewed=read(reviewedPath)
   fingerprint=hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
   assert fingerprint==reviewed['geometryFingerprint'],'Rebuild reviewed Madrid source for changed road/terrain'
   for entry in reviewed.get('banks',[reviewed]):
    zone=entry['zone']
    if zone['availability']=='available':assert entry.get('sceneAcceptance',{}).get('accepted'),'Do not regenerate an unaccepted available Madrid bank'
    slot=next((i for i,z in enumerate(zones) if z['zoneId']==zone['zoneId']),None)
    if slot is None:
     assert entry.get('oldZone') is None,'Missing legacy Madrid bank'
     zones.append(zone)
    else:zones[slot]=zone
 if id=='madrid' and (root/'src/circuits/season-review/madrid-withdrawn-public-models.json').exists():
  withdrawn=read('src/circuits/season-review/madrid-withdrawn-public-models.json')['withdrawn']
  for entry in withdrawn:
   current=next((z for z in zones if z['zoneId']==entry['zoneId']),None)
   assert current is None or current['name']==entry['originalZone']['name'],'Do not withdraw a newly reidentified public bank'
  zones=[z for z in zones if z['zoneId'] not in {e['zoneId'] for e in withdrawn}]
 if id=='silverstone':
  reviewed=read('src/circuits/europe/silverstone-village-a-2026.json')
  assert reviewed['circuitId']==id and reviewed['season']==data['season']==2026
  fingerprint=hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
  assert fingerprint==reviewed['geometryFingerprint'],'Rebuild Village A after road/terrain changes'
  assert reviewed.get('sceneAcceptance',{}).get('accepted') and reviewed['zone']['availability']=='available','Do not regenerate an unaccepted Village A'
  assert reviewed['roadIntersectionMetres2']<1e-6 and not reviewed['otherIntersections']
  zones[next(i for i,z in enumerate(zones) if z['zoneId']=='village-a')]=reviewed['zone']
  for area in read('src/circuits/europe/silverstone-boxpark-2026.json')['areas']:
   assert not area['geometryAccepted'] and area['newMetadata']['availability']=='preparing'
   next(z for z in zones if z['zoneId']==area['zoneId']).update(area['newMetadata'])
  club_path=root/'src/circuits/europe/silverstone-club-2026.json'
  if club_path.exists():
   from importlib.util import spec_from_file_location,module_from_spec
   spec=spec_from_file_location('reviewed_club',root/'scripts/apply-silverstone-club.py');module=module_from_spec(spec);spec.loader.exec_module(module)
   club=read(str(club_path.relative_to(root)));desired=module.reviewed(data,club);retired={z['zoneId'] for z in club['oldZones']+desired}
   zones=[z for z in zones if z['zoneId'] not in retired]+desired;data['spectatorZoneAliases']={**data.get('spectatorZoneAliases',{}),**club['aliases']}
  ga_path=root/'src/circuits/europe/silverstone-national-ga-2026.json'
  if ga_path.exists() and read(str(ga_path.relative_to(root)))['sceneAcceptance'].get('accepted'):
   from importlib.util import spec_from_file_location,module_from_spec
   spec=spec_from_file_location('reviewed_nps_ga',root/'scripts/apply-silverstone-national-ga.py');module=module_from_spec(spec);spec.loader.exec_module(module)
   zone,stand,layer=module.reviewed(data,read(str(ga_path.relative_to(root))))
   zones=[stand if z['zoneId']==stand['zoneId'] else z for z in zones if z['zoneId']!=zone['zoneId']]+[zone]
   assert read('src/circuits/barriers/silverstone.json')==layer,'Restore required accepted GA barriers before regenerating'
  vale_path=root/'src/circuits/europe/silverstone-vale-2026.json'
  if vale_path.exists() and read(str(vale_path.relative_to(root)))['sceneAcceptance'].get('accepted'):
   from importlib.util import spec_from_file_location,module_from_spec
   spec=spec_from_file_location('reviewed_vale',root/'scripts/apply-silverstone-vale.py');module=module_from_spec(spec);spec.loader.exec_module(module)
   zone,layer=module.reviewed(data,read(str(vale_path.relative_to(root))))
   zones=[zone if z['zoneId']=='vale' else z for z in zones]
   assert read('src/circuits/barriers/silverstone-vale.json')==layer,'Restore required Vale barriers before regenerating'
  vale_ga_path=root/'src/circuits/europe/silverstone-vale-ga-2026.json'
  if vale_ga_path.exists() and read(str(vale_ga_path.relative_to(root)))['sceneAcceptance'].get('accepted'):
   from importlib.util import spec_from_file_location,module_from_spec
   spec=spec_from_file_location('reviewed_vale_ga',root/'scripts/apply-silverstone-vale-ga.py');module=module_from_spec(spec);spec.loader.exec_module(module)
   zone=module.reviewed({**data,'spectatorZones':zones},read(str(vale_ga_path.relative_to(root))))
   zones=[z for z in zones if z['zoneId']!=zone['zoneId']]+[zone]
  farm_ga_path=root/'src/circuits/europe/silverstone-farm-ga-2026.json'
  if farm_ga_path.exists() and read(str(farm_ga_path.relative_to(root)))['sceneAcceptance'].get('accepted'):
   from importlib.util import spec_from_file_location,module_from_spec
   spec=spec_from_file_location('reviewed_farm_ga',root/'scripts/apply-silverstone-farm-ga.py');module=module_from_spec(spec);spec.loader.exec_module(module)
   zone,stand,layer=module.reviewed(data,read(str(farm_ga_path.relative_to(root))))
   zones=[stand if z['zoneId']=='farm-curve' else z for z in zones if z['zoneId']!=zone['zoneId']]+[zone]
   assert read('src/circuits/barriers/silverstone-farm.json')==layer,'Restore accepted Farm native fences before regenerating'
 if id=='spielberg' and (root/'src/circuits/europe/spielberg-t3-2026.json').exists() and read('src/circuits/europe/spielberg-t3-2026.json')['sceneAcceptance']['accepted']:
  from importlib.util import spec_from_file_location,module_from_spec
  spec=spec_from_file_location('reviewed_t3',root/'scripts/apply-spielberg-t3.py');module=module_from_spec(spec);spec.loader.exec_module(module)
  zone=module.reviewed(data,read('src/circuits/europe/spielberg-t3-2026.json'))
  zones=[zone if z['zoneId']=='t3' else z for z in zones]
 if id=='spielberg' and (root/'src/circuits/europe/spielberg-t9-identity-2026.json').exists():
  from importlib.util import spec_from_file_location,module_from_spec
  spec=spec_from_file_location('reviewed_t9',root/'scripts/apply-spielberg-t9-identity.py');module=module_from_spec(spec);spec.loader.exec_module(module)
  record=read('src/circuits/europe/spielberg-t9-identity-2026.json');zone=module.reviewed(data,record)
  zones=[zone if z['zoneId'] in ['ost-t8','t9'] else z for z in zones]
  data['spectatorZoneAliases']={**data.get('spectatorZoneAliases',{}),**record['aliases']}
 if id=='spa' and (root/'src/circuits/europe/spa-gold7-2026.json').exists():
  from importlib.util import spec_from_file_location,module_from_spec
  spec=spec_from_file_location('reviewed_spa_gold7',root/'scripts/apply-spa-gold7.py');module=module_from_spec(spec);spec.loader.exec_module(module)
  zone,layer=module.reviewed(data,read('src/circuits/europe/spa-gold7-2026.json'))
  assert read('src/circuits/barriers/spa-gold7.json')==layer,'Restore accepted Gold7 barriers before regenerating'
  zones=[zone if z['zoneId']==zone['zoneId'] else z for z in zones]
 if id=='spa' and (root/'src/circuits/europe/spa-gold8-2026.json').exists():
  from importlib.util import spec_from_file_location,module_from_spec
  spec=spec_from_file_location('reviewed_spa_gold8',root/'scripts/apply-spa-gold7.py');module=module_from_spec(spec);spec.loader.exec_module(module)
  zone,layer=module.reviewed(data,read('src/circuits/europe/spa-gold8-2026.json'),'Gold8')
  assert read('src/circuits/barriers/spa-gold7.json')==layer,'Restore shared La Source barriers before regenerating'
  zones=[zone if z['zoneId']==zone['zoneId'] else z for z in zones]
 if id=='spa' and (root/'src/circuits/europe/spa-gold7-bis-2026.json').exists():
  from importlib.util import spec_from_file_location,module_from_spec
  spec=spec_from_file_location('reviewed_spa_bis',root/'scripts/apply-spa-gold7.py');module=module_from_spec(spec);spec.loader.exec_module(module)
  zone,layer=module.reviewed(data,read('src/circuits/europe/spa-gold7-bis-2026.json'),'Bis')
  assert read('src/circuits/barriers/spa-gold7.json')==layer,'Restore shared La Source barriers before regenerating'
  zones=[z for z in zones if z['zoneId']!=zone['zoneId']]+[zone]
 if cid=='barcelona':
  import importlib.util
  spec=importlib.util.spec_from_file_location('barcelona_bank',root/'scripts/apply-barcelona-n-bank.py')
  module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  accepted=module.reviewed_zones(data,read('src/circuits/europe/barcelona-n-bank-2026.json'))
  ids={z['zoneId'] for z in accepted}
  zones=[z for z in zones if z['zoneId'] not in ids]+accepted
 data['spectatorZones']=zones;data['spectatorZoneIds']=[z['zoneId'] for z in zones if z['availability']=='available'];data['simulationAvailability']='available'
 (root/f'src/circuits/generated/{id}.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
 manifest[id]=dict(source=url,osm=osm.get(id,{}),imageControls=controls.get(id,{}),manual=records,zones=len(zones))
 print(id,len(zones),flush=True)
(root/'src/circuits/europe/review.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
summaries=read('src/circuits/generated/summaries.json')
for c in summaries:
 if c['circuitId'] in sources:
  d=read(f"src/circuits/generated/{c['circuitId']}.json");c['spectatorZoneIds']=d['spectatorZoneIds'];c['simulationAvailability']='available'
(root/'src/circuits/generated/summaries.json').write_text(json.dumps(summaries,ensure_ascii=False,indent=2),encoding='utf8')

# Review before enabling any generated footprint. Do not translate it away from roads.
import subprocess
subprocess.run([__import__("sys").executable,"scripts/apply-spectator-corrections.py"],cwd=root,check=True)
subprocess.run([__import__("sys").executable,"scripts/apply-spectator-datums.py"],cwd=root,check=True)
subprocess.run([__import__("sys").executable,"scripts/apply-zandvoort-ga.py"],cwd=root,check=True)
subprocess.run(["node", "node_modules/vite-node/vite-node.mjs", "scripts/export-spectator-audit.ts"], cwd=root, check=True)
subprocess.run([__import__("sys").executable, "scripts/audit-europe-spectators.py"], cwd=root, check=True)
subprocess.run([__import__("sys").executable, "scripts/constrain-spectator-footprints.py"], cwd=root, check=True)
subprocess.run([__import__("sys").executable, "scripts/apply-silverstone-boxpark-review.py"], cwd=root, check=True)

subprocess.run([sys.executable,'scripts/apply-spielberg-supplement.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-hungaroring-supplement.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-barcelona-supplement.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-monaco-rocher.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-spa-ter.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-spa-repairs.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-zandvoort-repairs.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-silverstone-supplement.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-silverstone-ga-plus.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-silverstone-remaining-ga.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-hungaroring-fan2.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-hungaroring-ga-bands.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-monaco-b.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-barcelona-jove.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-madrid-c-ground.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-spielberg-ga-west.py'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-monaco-e.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-monaco-x.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-madrid-remaining-approx.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-barcelona-common-pelouse.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-barcelona-pelouse-north.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-barcelona-pelouse-t8.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-spa-bronze.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-barcelona-pelouse-privilege.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-monaco-o-tiers.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-monaco-t-tiers.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-monaco-m-withdrawal.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-madrid-gd12-approx.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-silverstone-accessible.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-silverstone-inside-nine.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-madrid-outer-supplement.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-monza-supplement.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)

subprocess.run([sys.executable,'scripts/apply-spa-annual-supplement.py'],cwd=root,check=True)
subprocess.run([sys.executable,'scripts/sync-circuit-summaries.py','--write'],cwd=root,check=True)
