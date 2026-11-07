"""Native named Vale building and its neighboring ground; no GA admission inference."""
import copy,hashlib,json,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
digest=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
target=ROOT/'src/circuits/europe/silverstone-vale-2026.json'
if target.exists() and read(str(target.relative_to(ROOT))).get('sceneAcceptance',{}).get('accepted'):raise ValueError('Preserve accepted Vale source')
meta=read('research/season-review/silverstone-club/osm-20261028.meta.json');raw=(ROOT/'research/season-review/silverstone-club/osm-20261028.xml').read_bytes()
assert hashlib.sha256(raw).hexdigest()==meta['sha256']
xml=ET.fromstring(raw);nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in xml.findall('node')};ways={int(w.get('id')):w for w in xml.findall('way')}
coordinates=lambda w:[nodes[n.get('ref')] for n in ways[w].findall('nd')]
boundary=coordinates(227342453);tags={t.get('k'):t.get('v') for t in ways[227342453].findall('tag')};assert tags=={'building':'yes','name':'Vale'}
data=read('src/circuits/generated/silverstone.json');old=next(z for z in data['spectatorZones'] if z['zoneId']=='vale');zone=copy.deepcopy(old)
zone['boundary']=boundary;zone['availability']='preparing'
surface=zone['surfaces'][0];surface['boundary']=boundary;surface['rowFrontEdge']={'coordinates':[boundary[2],boundary[3]]};surface['rowPitch']={'treadMetres':1.02,'riserMetres':.54}
surface['groundReference']=[sum(p[i] for p in [boundary[2],boundary[3]])/2 for i in range(2)]
surface['fenceMode']='authored';zone['requiredBarrierIds']=['vale-trackside-fence']
source={'url':'https://www.openstreetmap.org/way/227342453','checkedAt':'2026-10-28','method':'estimated','confidence':'low','notes':'Full native named Vale building plan, cross-checked with2026 organizer map relative to Club A and Vale curve. Existing17rows/8.64m rise/2.2m base retained as estimates, seated eyes1.2m. Front edge2-3; estimated1.02m treads/0.54m risers within the source footprint, including its millimetre-scale side bends; no ticket-seat survey or invented GA admission.'}
zone['source']=source;zone['boundarySource']=source;zone['surfaceSource']=source
zone['geometryReview']={'checkedAt':'2026-10-28','issues':['Native Vale candidate needs device/physical acceptance.'],'method':'Source building boundary, front-edge datum and native trackside fence; no mechanical translation.'}
fence=ways[359370784];refs=[n.get('ref') for n in fence.findall('nd')];a,b=sorted([refs.index('3640974369'),refs.index('5745581293')]);excerpt=[nodes[r] for r in refs[max(0,a-1):b+2]]
barrier={'id':'vale-trackside-fence','kind':'chain-link','coordinates':excerpt,'heightMetres':3.5,'source':{'url':'https://www.openstreetmap.org/way/359370784','checkedAt':'2026-10-28','method':'estimated','confidence':'low','notes':'Native fence plan excerpt along the ground in front of Vale; height3.5m estimated, not measured. Excerpt limits modeled context, not actual fence termini.'}}
record={'circuitId':'silverstone','season':2026,'geometryFingerprint':digest({k:data[k] for k in ['trackGeometry','corners','elevation']}),'osmSnapshot':meta,'nativeStandWay':227342453,'nativeGroundWay':605892812,'nativeFenceWay':359370784,'groundSharedStandNodeIds':['2360432044','2360432064','5745581294'],'oldZone':old,'zone':zone,'barrierLayer':{'circuitId':'silverstone','availability':'preparing','barriers':[barrier],'notes':'Native Vale foreground catch fence; height estimated. Required for Vale views.'},'gaEvidence':{'mapDrawingIndex':41,'nativeGroundBoundary':coordinates(605892812),'runtimeGAAdded':False,'limits':'Native grass shares the source stand front. The diagram confirms a GA band in this vicinity, but does not establish that every part of this landuse polygon is ordinary GA.'},'sceneAcceptance':{'accepted':False},'limits':'Native plan and2026 relative-map check do not measure platform/roof heights. Existing estimated vertical profile retained; explicit physical and device review required.'}
target.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
path=ROOT/'src/circuits/barriers/silverstone-vale.json';path.write_text(json.dumps(record['barrierLayer'],ensure_ascii=False,indent=2)+'\n','utf8')
print('Native Vale candidate prepared; no runtime seat/GA changed.')
