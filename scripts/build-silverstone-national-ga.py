"""Interpret the marked NPS GA strip using native stand/fence boundaries.
End cuts and0.3m body clearance are explicit modeling assumptions, not ticket GIS.
"""
import copy,hashlib,json,math,xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import LineString,Polygon,Point
from shapely.ops import substring
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
existing=ROOT/'src/circuits/europe/silverstone-national-ga-2026.json'
if existing.exists() and read(str(existing.relative_to(ROOT))).get('sceneAcceptance',{}).get('accepted'):raise ValueError('Preserve accepted GA source; rebuild into a separately reviewed candidate')
raw=ROOT/'research/season-review/silverstone-ga/national-osm-20261028.xml'
meta=read('research/season-review/silverstone-ga/national-osm-20261028.meta.json')
assert meta['status']==200 and hashlib.sha256(raw.read_bytes()).hexdigest()==meta['sha256']
xml=ET.fromstring(raw.read_bytes());nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in xml.findall('node')};ways={w.get('id'):w for w in xml.findall('way')}
data=read('src/circuits/generated/silverstone.json');metric=read('artifacts/goal-review/silverstone-standing-metric.json')
assert metric['inputs']=={k:data[k] for k in ['trackGeometry','corners','elevation']}
origin=metric['origin'];factor=[111320*math.cos(math.radians(origin[1]))*metric['calibration'],-111320*metric['calibration']]
xy=lambda p:[(p[i]-origin[i])*factor[i] for i in range(2)]
geo=lambda p:[origin[i]+p[i]/factor[i] for i in range(2)]
stand=next(z for z in data['spectatorZones'] if z['zoneId']=='national-pit-straight');a,b=map(xy,stand['boundary'][1:3]);front=LineString([a,b])
native=lambda ident:[nodes[n.get('ref')] for n in ways[str(ident)].findall('nd')]
assert native(227342452)==stand['boundary']
fence=LineString([xy(p) for p in native(507990933)]);wall=LineString([xy(p) for p in native(507977965)])
start,end=fence.project(Point(a)),fence.project(Point(b));edge=substring(fence,start,end)
ring=[a,b,*list(edge.coords)[::-1],a];ticket=Polygon(ring);assert ticket.is_valid and 100<ticket.area<1500
ground=ticket.buffer(-.3,join_style=2);assert ground.geom_type=='Polygon' and ground.area>100
boundary=[geo(p) for p in ground.exterior.coords]
center=Point([sum(p[i] for p in list(ground.exterior.coords)[:-1])/(len(ground.exterior.coords)-1) for i in range(2)]);road=LineString(metric['road']);front_reference=geo(road.interpolate(road.project(center)).coords[0])
source={'url':meta['url'],'checkedAt':'2026-10-28','method':'estimated','confidence':'low','notes':'Interpreted2026 ordinary-GA band in front of National Pit Straight. Native stand front and fence bound the strip; end cuts at stand endpoints and0.3m standing-body clearance are modeling assumptions, not surveyed ticket boundaries. Terrain follows retained EA DTM.'}
barriers=[]
for ident,line,kind,height,width in [(507990933,fence,'chain-link',3.5,None),(507977965,wall,'concrete-wall',1.,.25)]:
 u,v=line.project(Point(a)),line.project(Point(b));lo,hi=sorted([u,v]);part=substring(line,max(0,lo-5),min(line.length,hi+5))
 item={'id':'nps-ga-catch-fence' if kind=='chain-link' else 'nps-ga-concrete-wall','kind':kind,'coordinates':[geo(p) for p in part.coords],'heightMetres':height,'source':{'url':f'https://www.openstreetmap.org/way/{ident}','checkedAt':'2026-10-28','method':'estimated','confidence':'low','notes':'Exact excerpt of native plan line, not relocated. Fence3.5m / wall1.0m height and0.25m wall width are estimates; endpoints limit modeled context, not actual barrier termini.'}}
 if width:item['widthMetres']=width
 barriers.append(item)
ids=[b['id'] for b in barriers]
zone={'zoneId':'ga-national-pit-straight','name':'National Pit Straight · GA','kind':'general-admission','availability':'preparing','boundary':boundary,'surface':{'baseHeight':0,'rise':0,'depth':round(ground.area/front.length,3),'eyeHeight':1.65},'surfaces':[{'surfaceId':'ga-national-pit-straight-ground','boundary':boundary,'baseHeight':0,'rise':0,'rows':0,'eyeHeight':1.65,'terrainFollow':True,'fenceMode':'authored','frontReference':front_reference}],'requiredBarrierIds':ids,'source':source,'boundarySource':source,'surfaceSource':source,'openingSource':{'url':'https://www.silverstone.co.uk/news/silverstone-f1r-tickets-2026-your-guide','checkedAt':'2026-10-28','method':'published','confidence':'medium','notes':'2026 ordinary GA is unreserved viewing without grandstand admission. Final2026 organizer map drawing38 marks the strip immediately in front of National Pit Straight; diagram is positive location evidence, not metric geometry.'},'admissionNote':'普通GA · 不含看台准入','geometryReview':{'checkedAt':'2026-10-28','issues':['Interpreted source boundary / physical and device review pending.'],'method':'Native front-to-fence envelope, source-based end cuts and body clearance; not a complete GA product or a ticket survey.'}}
record={'circuitId':'silverstone','season':2026,'mapDrawingIndex':38,'geometryFingerprint':hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),'osmSnapshot':meta,'sourceStandWay':227342452,'sourceFenceWay':507990933,'sourceWallWay':507977965,'frontEdgeIndices':[1,2],'ticketEnvelopeGeo':[geo(p) for p in ticket.exterior.coords],'bodyClearanceMetres':.3,'selectionAreaMetres2':ground.area,'ticketEnvelopeAreaMetres2':ticket.area,'frontToFenceMinimumMetres':front.distance(fence),'oldStand':stand,'zone':zone,'barrierLayer':{'circuitId':'silverstone','availability':'preparing','barriers':barriers,'notes':'Native NPS plan excerpts; source heights estimated. Mandatory for GA and NPS seating views; do not silently omit on resource errors.'},'sceneAcceptance':{'accepted':False},'limits':'An interpreted approximate footprint, not an exact2026 ticket boundary. No entire landuse polygon is assumed public. One of five marked ordinary-GA band groups only; GA+ and other GA areas remain separate. Standing eyes1.65m; barriers remain real geometry.'}
path=ROOT/'src/circuits/europe/silverstone-national-ga-2026.json';path.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
layer=ROOT/'src/circuits/barriers/silverstone.json';layer.parent.mkdir(exist_ok=True);layer.write_text(json.dumps(record['barrierLayer'],ensure_ascii=False,indent=2)+'\n','utf8')
print(f'NPS interpreted envelope{ticket.area:.1f}m2; standing selection{ground.area:.1f}m2; minimum stand/fence gap{front.distance(fence):.2f}m. Candidate only.')
