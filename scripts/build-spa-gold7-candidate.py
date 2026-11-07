"""Prepare a visual/physical candidate without promoting its inferred ticket identity."""
import copy,hashlib,json,math,xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union,nearest_points
ROOT=Path(__file__).resolve().parents[1]
assert not (ROOT/'src/circuits/europe/spa-gold7-2026.json').exists(),'Gold7 has a reviewed migration; preserve the historical candidate rather than overwrite it from runtime.'
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
data=read('src/circuits/generated/spa.json');review=read('src/circuits/season-review/spa-la-source-2026.json');metric=read('artifacts/goal-review/spa-native/road.json')
assert hashlib.sha256((ROOT/'src/circuits/generated/spa.json').read_bytes()).hexdigest()==metric['generatedSha256']
native=next(p for p in review['nativeCandidates'] if p['way']==1366085152)
old=next(z for z in data['spectatorZones'] if z['zoneId']=='gold-7-la-source');zone=copy.deepcopy(old)
origin=metric['origin'];factor=[111320*math.cos(math.radians(origin[1]))*metric['calibration'],-111320*metric['calibration']]
xy=lambda p:[(p[i]-origin[i])*factor[i] for i in range(2)]
polygon=Polygon([xy(p) for p in native['boundary']]);road=unary_union([Polygon(t) for t in metric['triangles']])
overlap=polygon.intersection(road).area;assert overlap<1e-6
conflicts=[z['zoneId'] for z in data['spectatorZones'] if z['zoneId']!=old['zoneId'] and polygon.intersection(Polygon([xy(p) for p in z['boundary']])).area>1e-6]
assert not conflicts,conflicts
target=nearest_points(polygon.centroid,road)[1];reference=[origin[i]+target.coords[0][i]/factor[i] for i in range(2)]
zone['boundary']=native['boundary'];s=zone['surfaces'][0];s['boundary']=native['boundary'];s['rowFrontEdge']={'coordinates':[native['boundary'][0],native['boundary'][1]]};s['frontReference']=reference
s['groundReference']=[sum(native['boundary'][k][i] for k in [0,1])/2 for i in range(2)]
s['canopy']=dict(rearClearanceMetres=3.0,crownMetres=.6,postWidthMetres=.12,supportU=[0,.5,1],supportEdges=[[0,1],[3,2]],source=dict(url=review['physicalReferenceEvidence']['organizerPanorama']['url'],checkedAt='2026-10-28',method='estimated',confidence='low',notes='Roof existence and front/rear support arrangement informed by official panorama. Simplified curved roof over native plan; rear clearance3m, crown0.6m, square posts0.12m and three support stations are estimates, not structural measurements. No eye-height changes.'))
zone['availability']='available';zone['geometryReview']={'checkedAt':'2026-10-28','issues':[],'method':'Candidate-only native plan and authored track-facing edge; identity and scene acceptance remain separate.'}
zone['source']={**zone['source'],'url':'https://www.openstreetmap.org/way/1366085152','checkedAt':'2026-10-28','method':'estimated','confidence':'low','notes':'Candidate association with Gold7 inferred from organizer panorama and SPW2023 roof/neighbor/track relationships; not a named native object or surveyed2026 ticket boundary. Original vertical profile retained. Not accepted for runtime.'}
record=dict(circuitId='spa',season=2026,nativeStandWay=1366085152,sourceReview='src/circuits/season-review/spa-la-source-2026.json',oldZone=old,zone=zone,sourceBoundary=native['boundary'],roadIntersectionMetres2=overlap,otherZoneIntersections=conflicts,identityAccepted=False,sceneAcceptance={'accepted':False},runtimeApplied=False,limits='Candidate preview only. Panorama capture date and2026 ticket footprint unverified. Old estimated vertical parameters are preserved, not newly measured.')
record['canopyReview']=dict(implemented=True,scope='Shared static roof/post meshes in live views and temporal photograph depth rendering. Roof hidden only in overhead selection to expose the picking surface; posts retained. Both opaque in eye/phone modes.',estimatedDimensions=True,source=s['canopy']['source'],productionApplied=False)
raw=(ROOT/'research/season-review/spa/la-source-20261028.xml').read_bytes()
assert hashlib.sha256(raw).hexdigest()==review['nativeSnapshot']['sha256']
xml=ET.fromstring(raw);nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in xml.findall('node')}
front=LineString([xy(p) for p in native['boundary'][:2]]);nearby=[]
for way in xml.findall('way'):
 tags={t.get('k'):t.get('v') for t in way.findall('tag')}
 if 'barrier' not in tags:continue
 line=LineString([xy(nodes[n.get('ref')]) for n in way.findall('nd')])
 if line.distance(front)>=30:continue
 nearby.append(dict(way=int(way.get('id')),kind=tags['barrier'],distanceToFrontMetres=line.distance(front),withinStandMetres=line.intersection(polygon).length,withinRoadMetres=line.intersection(road).length,heightTag=tags.get('height'),roleVerified=False))
record['barrierReview']=dict(nearbyNativeBarriers=nearby,scope='Native objects within30m of the source front; proximity does not identify trackside versus rear perimeter. Current candidate still uses the legacy simplified fence.',accepted=False)
roles={1366085142:('chain-link',2.0,'stand-side perimeter'),175691647:('chain-link',3.5,'outer trackside fence'),126871627:('concrete-wall',1.0,'trackside wall'),1134053911:('chain-link',2.0,'rear perimeter')}
barriers=[]
for way in xml.findall('way'):
 ident=int(way.get('id'))
 if ident not in roles:continue
 kind,height,role=roles[ident];entry=next(a for a in nearby if a['way']==ident)
 assert entry['withinStandMetres']<1e-6 and entry['withinRoadMetres']<1e-6
 barriers.append(dict(id=f'spa-gold7-{ident}',kind=kind,coordinates=[nodes[n.get('ref')] for n in way.findall('nd')],heightMetres=height,**({'widthMetres':.25} if kind=='concrete-wall' else {}),source=dict(url=f'https://www.openstreetmap.org/way/{ident}',checkedAt='2026-10-28',method='estimated',confidence='low',notes=f'Full native plan; {role} interpreted from ordered stand/fence/wall/road relationships and organizer panorama. Height{height}m estimated, not measured. Not surveyed2026 barrier geometry.')))
assert len(barriers)==4
facilities=read('src/circuits/facilities/spa.json');facility_metric=read('artifacts/goal-review/spa-native/facilities.json')
assert facility_metric['generatedSha256']==metric['generatedSha256']
assert facility_metric['facilitiesSha256']==hashlib.sha256((ROOT/'src/circuits/facilities/spa.json').read_bytes()).hexdigest()
pit=unary_union([Polygon(t) for t in facility_metric['pitTriangles']])
buildings=unary_union([Polygon([xy(p) for p in b['boundary']]) for b in facilities['buildings']])
pit_overlap=polygon.intersection(pit).area;building_overlap=polygon.intersection(buildings).area
assert pit_overlap<1e-6 and building_overlap<1e-6
record['facilityReview']=dict(facilitiesSha256=facility_metric['facilitiesSha256'],renderedPitOverlapMetres2=pit_overlap,buildingPlanOverlapMetres2=building_overlap,pitTriangleCount=len(facility_metric['pitTriangles']),scope='Current actual pit mesh and source building plans; no claim that the underlying facility geography is newly surveyed.')
zone['requiredBarrierIds']=[b['id'] for b in barriers];zone['surfaces'][0]['fenceMode']='authored'
record['barrierLayer']=dict(circuitId='spa',availability='preparing',barriers=barriers)
record['barrierReview'].update(scope='Candidate now previews full native stand-side/trackside/rear fence plans and wall, with explicitly estimated heights; no synthetic fence retained. Plane ordering is interpreted, not a2026 survey.',accepted=False)
path=ROOT/'src/circuits/europe/spa-gold7-candidate.json'
if path.exists():assert not read(str(path.relative_to(ROOT))).get('sceneAcceptance',{}).get('accepted'),'Preserve accepted evidence'
path.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
print('Gold7 candidate: full native boundary, original vertical profile, zero road/zone overlap; runtime unchanged.')


