"""Farm foreground envelope from the expanded native connected fence graph."""
import copy,hashlib,json,math,xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import LineString,Polygon
from shapely.ops import substring
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
digest=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
target=ROOT/'src/circuits/europe/silverstone-farm-ga-2026.json'
if target.exists() and read(str(target.relative_to(ROOT))).get('sceneAcceptance',{}).get('accepted'):raise ValueError('Preserve accepted Farm GA source')
raw=(ROOT/'research/season-review/silverstone-ga/farm-osm-20261028.xml').read_bytes();meta=read('research/season-review/silverstone-ga/farm-osm-20261028.meta.json');assert hashlib.sha256(raw).hexdigest()==meta['sha256']
xml=ET.fromstring(raw);nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in xml.findall('node')};ways={int(w.get('id')):w for w in xml.findall('way')}
native=lambda ident:[nodes[n.get('ref')] for n in ways[ident].findall('nd')]
data=read('src/circuits/generated/silverstone.json');metric=read('artifacts/goal-review/silverstone-standing-metric.json');assert metric['inputs']=={k:data[k] for k in ['trackGeometry','corners','elevation']}
old=next(z for z in data['spectatorZones'] if z['zoneId']=='farm-curve');assert old['boundary']==native(227342449)
o=metric['origin'];factor=[111320*math.cos(math.radians(o[1]))*metric['calibration'],-111320*metric['calibration']]
xy=lambda p:[(p[i]-o[i])*factor[i] for i in range(2)]
geo=lambda p:[o[i]+p[i]/factor[i] for i in range(2)]
coords=lambda ident:[xy(p) for p in native(ident)]
stand=coords(227342449);a,b=stand[3],stand[1];axis=[(b[i]-a[i])/math.dist(a,b) for i in range(2)];normal=[-axis[1],axis[0]]
east_cut=LineString([[b[i]+normal[i]*t for i in range(2)] for t in [-300,300]])
front=LineString(coords(359218994));end=front.intersection(east_cut);assert end.geom_type=='Point';front_part=substring(front,0,front.project(end))
rear=coords(359218998)[:5];west=coords(359218995)[18:];bridge=coords(359218997)[:5]
assert west[0]==rear[0] and west[-1]==bridge[0] and tuple(bridge[-1])==front.coords[0]
envelope=Polygon([*rear,*list(front_part.coords)[::-1],*bridge[::-1],*west[::-1],rear[0]])
assert envelope.is_valid and envelope.intersection(Polygon(stand)).area<1e-6
ground=envelope.buffer(-.3,join_style=2);assert ground.geom_type=='Polygon' and not ground.interiors
# Preserve the native east spur of997 too; do not erase it for clean rendering.
assert LineString(coords(359218997)[4:]).intersection(ground).length==0
barriers=[]
for ident,points,height,role in [(359218994,[geo(p) for p in substring(front,0,min(front.length,front.project(end)+5)).coords],3.5,'outer'),(359218997,native(359218997),3.5,'outer-west'),(359218998,native(359218998),2.,'stand-perimeter'),(359218995,native(359218995)[17:],2.,'west-perimeter')]:
 barriers.append({'id':f'farm-fence-{ident}','kind':'chain-link','coordinates':points,'heightMetres':height,'source':{'url':f'https://www.openstreetmap.org/way/{ident}','checkedAt':'2026-10-28','method':'estimated','confidence':'low','notes':f'Native {role} fence plan. No height/type tag: outer3.5m and perimeter2m mesh heights are estimates based on modeled roles, not measurements or visibility adjustments. Excerpt endpoints limit context, not actual fence termini.'}})
ids=[b['id'] for b in barriers];boundary=[geo(p) for p in ground.exterior.coords]
source={'url':meta['url'],'checkedAt':'2026-10-28','method':'estimated','confidence':'low','notes':'Approximate interpretation of2026 positive Farm Curve GA band drawing40. Expanded native snapshot supplies995/997/994/998 connected foreground fence edges; east end is cut at the stand endpoint and0.3m body clearance is assumed. Not a surveyed ticket boundary; no rear/inside-track grass parcel is granted admission. Surface cover is not verified as grass.'}
zone={'zoneId':'ga-farm-curve','name':'Farm Curve · GA','kind':'general-admission','availability':'preparing','boundary':boundary,'surface':{'baseHeight':0,'rise':0,'depth':ground.area/math.dist(a,b),'eyeHeight':1.65},'surfaces':[{'surfaceId':'ga-farm-curve-ground','boundary':boundary,'baseHeight':0,'rise':0,'rows':0,'eyeHeight':1.65,'terrainFollow':True,'terrainMeshSpacingMetres':1,'fenceMode':'authored','frontReference':old['surfaces'][0]['frontReference']}],'requiredBarrierIds':ids,'source':source,'boundarySource':source,'surfaceSource':source,'openingSource':{'url':read('src/circuits/season-review/silverstone-ga-access-2026.json')['annualMap']['url'],'checkedAt':'2026-10-28','method':'published','confidence':'medium','notes':'Final2026 Silverstone-authored map drawing40 positively marks GA in front of Farm Curve. Map position and2026 ordinary-GA/no-grandstand admission guide do not measure the exact perimeter.'},'admissionNote':'普通GA · 近似范围 · 不含看台准入','geometryReview':{'checkedAt':'2026-10-28','issues':['Native foreground candidate requires scene and physical acceptance.'],'method':'Connected native fence graph, interpreted east cap and body clearance; not arbitrary landuse selection.'}}
stand_zone=copy.deepcopy(old);stand_zone['surfaces'][0]['fenceMode']='authored';stand_zone['requiredBarrierIds']=ids
layer={'circuitId':'silverstone','availability':'preparing','barriers':barriers,'notes':'Farm foreground native fence graph from expanded2026-10-28 OSM snapshot; role-dependent heights estimated. Mandatory for Farm seating and GA, no duplicate synthetic fences.'}
record={'circuitId':'silverstone','season':2026,'geometryFingerprint':digest({k:data[k] for k in ['trackGeometry','corners','elevation']}),'nativeSnapshot':meta,'nativeStandWay':227342449,'nativeFenceWays':[359218995,359218997,359218994,359218998],'mapDrawingIndex':40,'annualMap':read('src/circuits/season-review/silverstone-ga-access-2026.json')['annualMap'],'sourceConnections':{'995to997':'3639746105','997to994':'3643380799','995to998':'3639746107'},'previousQueryWasIncomplete':True,'ticketEnvelopeGeo':[geo(p) for p in envelope.exterior.coords],'envelopeAreaMetres2':envelope.area,'selectionAreaMetres2':ground.area,'bodyClearanceMetres':.3,'oldStand':old,'stand':stand_zone,'zone':zone,'barrierLayer':layer,'sceneAcceptance':{'accepted':False},'limits':'Approximate Farm stand-front GA envelope, not full ordinary-GA ticket GIS. West/front/rear use native lines; east cap and body clearance interpreted. Standing1.65m/seated1.2m, estimated fence heights and actual terrain retained.'}
target.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8');path=ROOT/'src/circuits/barriers/silverstone-farm.json';path.write_text(json.dumps(layer,ensure_ascii=False,indent=2)+'\n','utf8')
print(f'Farm foreground candidate {ground.area:.2f}m2; connected native fences, no runtime promotion.')
