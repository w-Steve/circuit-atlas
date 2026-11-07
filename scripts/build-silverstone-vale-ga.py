"""Interpret only the confirmed stand-front GA band, not the entire grass parcel."""
import copy,hashlib,json,math,xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import Polygon
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
digest=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
target=ROOT/'src/circuits/europe/silverstone-vale-ga-2026.json'
if target.exists() and read(str(target.relative_to(ROOT))).get('sceneAcceptance',{}).get('accepted'):raise ValueError('Preserve accepted Vale GA source')
vale=read('src/circuits/europe/silverstone-vale-2026.json');data=read('src/circuits/generated/silverstone.json');metric=read('artifacts/goal-review/silverstone-standing-metric.json')
raw=(ROOT/'research/season-review/silverstone-club/osm-20261028.xml').read_bytes();assert hashlib.sha256(raw).hexdigest()==vale['osmSnapshot']['sha256']
xml=ET.fromstring(raw);nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in xml.findall('node')};way=next(w for w in xml.findall('way') if w.get('id')=='605892812');native_ground=[nodes[n.get('ref')] for n in way.findall('nd')]
assert native_ground==vale['gaEvidence']['nativeGroundBoundary'],'Preserve native ground provenance'
assert vale['sceneAcceptance']['accepted'] and metric['inputs']=={k:data[k] for k in ['trackGeometry','corners','elevation']}
assert next(z for z in data['spectatorZones'] if z['zoneId']=='vale')==vale['zone']
origin=metric['origin'];scale=[111320*math.cos(math.radians(origin[1]))*metric['calibration'],-111320*metric['calibration']]
xy=lambda p:[(p[i]-origin[i])*scale[i] for i in range(2)]
geo=lambda p:[origin[i]+p[i]/scale[i] for i in range(2)]
stand=vale['zone']['boundary'];a,b=map(xy,[stand[2],stand[3]]);length=math.dist(a,b);axis=[(b[i]-a[i])/length for i in range(2)];normal=[-axis[1],axis[0]]
point=lambda u,v:[a[i]+u*axis[i]+v*normal[i] for i in range(2)]
# These end cuts are an explicit interpretation of the diagram, not surveyed
# admission boundaries. Intersection retains every native indentation/obstacle.
strip=Polygon([point(0,-400),point(length,-400),point(length,400),point(0,400)])
grass=Polygon([xy(p) for p in vale['gaEvidence']['nativeGroundBoundary']]);envelope=grass.intersection(strip)
assert envelope.is_valid and envelope.geom_type=='Polygon' and envelope.area>100
ground=envelope.buffer(-.3,join_style=2);assert ground.is_valid and ground.geom_type=='Polygon' and not ground.interiors
boundary=[geo(p) for p in ground.exterior.coords]
source={'url':'https://www.openstreetmap.org/way/605892812','checkedAt':'2026-10-28','method':'estimated','confidence':'low','notes':'Approximate interpretation of2026 organizer drawing41 GA band in front of Vale. Native grass parcel605892812 shares the named stand front; select only its stand-span intersection, with0.3m body clearance. Stand-end cuts are assumptions, not surveyed ticket boundaries. The rest of the parcel is not granted GA admission.'}
zone={'zoneId':'ga-vale','name':'Vale · GA','kind':'general-admission','availability':'preparing','boundary':boundary,'surface':{'baseHeight':0,'rise':0,'depth':ground.area/length,'eyeHeight':1.65},'surfaces':[{'surfaceId':'ga-vale-ground','boundary':boundary,'baseHeight':0,'rise':0,'rows':0,'eyeHeight':1.65,'terrainFollow':True,'fenceMode':'authored','frontReference':vale['zone']['surfaces'][0]['frontReference']}],'requiredBarrierIds':['vale-trackside-fence'],'source':source,'boundarySource':source,'surfaceSource':source,'openingSource':{'url':vale['annualMap']['url'],'checkedAt':'2026-10-28','method':'published','confidence':'medium','notes':'Silverstone-authored final2026 map drawing41 positively marks ordinary GA in front of the Vale stand. The drawing verifies relative location and product identity, not exact depth or geographic perimeter. Ordinary GA guide excludes grandstand admission.'},'admissionNote':'普通GA · 近似范围 · 不含看台准入','geometryReview':{'checkedAt':'2026-10-28','issues':['Interpreted GA ground requires physical/device acceptance.'],'method':'Native ground clipped to the stand-front span; end cuts and body clearance explicitly estimated.'}}
record={'circuitId':'silverstone','season':2026,'geometryFingerprint':digest({k:data[k] for k in ['trackGeometry','corners','elevation']}),'valeSourceFingerprint':digest({'zone':vale['zone'],'barrierLayer':vale['barrierLayer']}),'annualMap':vale['annualMap'],'mapDrawingIndex':41,'coverage':'stand-front subset of the positive Vale band; not all ordinary GA or the full landuse parcel','nativeGroundWay':605892812,'nativeStandWay':227342453,'nativeFenceWay':359370784,'nativeSnapshot':vale['osmSnapshot'],'nativeGroundAreaMetres2':grass.area,'interpretedEnvelopeAreaMetres2':envelope.area,'selectionAreaMetres2':ground.area,'bodyClearanceMetres':.3,'ticketEnvelopeGeo':[geo(p) for p in envelope.exterior.coords],'zone':zone,'barrierLayer':copy.deepcopy(vale['barrierLayer']),'sceneAcceptance':{'accepted':False},'limits':'Approximate public-viewing envelope tied to a confirmed diagram band, native ground and fence; not a ticket GIS or2026 terrain survey. Standing eyes1.65m; true fence occlusion retained. Other GA/GA+ coverage remains incomplete.'}
record['nativeGroundBoundaryFingerprint']=digest(native_ground)
target.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
print(f'Vale GA candidate: {ground.area:.1f}m2 selection of {grass.area:.1f}m2 native parcel; not runtime-applied.')
