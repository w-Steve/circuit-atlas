"""Prepare a source-associated Gold8 approximation for physical review."""
import copy,hashlib,json,math
from pathlib import Path
from shapely.geometry import Polygon
from shapely.ops import unary_union,nearest_points
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
digest=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
target=ROOT/'src/circuits/europe/spa-gold8-2026.json'
assert not target.exists(),'Preserve reviewed Gold8 evidence; regenerate explicitly after reviewing changes'
data=read('src/circuits/generated/spa.json');review=read('src/circuits/season-review/spa-la-source-2026.json');metric=read('artifacts/goal-review/spa-native/road.json')
assert hashlib.sha256((ROOT/'src/circuits/generated/spa.json').read_bytes()).hexdigest()==metric['generatedSha256']
native=next(c for c in review['nativeCandidates'] if c['way']==1366085153)
old=next(z for z in data['spectatorZones'] if z['zoneId']=='gold-8-source-start');zone=copy.deepcopy(old);surface=zone['surfaces'][0]
o=metric['origin'];f=[111320*math.cos(math.radians(o[1]))*metric['calibration'],-111320*metric['calibration']]
xy=lambda p:[(p[i]-o[i])*f[i] for i in range(2)]
polygon=Polygon([xy(p) for p in native['boundary']]);road=unary_union([Polygon(t) for t in metric['triangles']]);assert polygon.intersection(road).area<1e-6
others=[z for z in data['spectatorZones'] if z['zoneId']!=old['zoneId']]
conflicts=[z['zoneId'] for z in others if polygon.intersection(Polygon([xy(p) for p in z['boundary']])).area>1e-6];assert not conflicts,conflicts
facilities=read('src/circuits/facilities/spa.json');fm=read('artifacts/goal-review/spa-native/facilities.json')
assert fm['generatedSha256']==metric['generatedSha256']
assert fm['facilitiesSha256']==hashlib.sha256((ROOT/'src/circuits/facilities/spa.json').read_bytes()).hexdigest()
pit=unary_union([Polygon(t) for t in fm['pitTriangles']]);buildings=unary_union([Polygon([xy(p) for p in b['boundary']]) for b in facilities['buildings']])
assert polygon.intersection(pit).area<1e-6 and polygon.intersection(buildings).area<1e-6
front=[native['boundary'][i] for i in [2,3]];middle=[sum(p[i] for p in front)/2 for i in range(2)];reference=nearest_points(Polygon([xy(p) for p in native['boundary']]).centroid,road)[1]
zone['boundary']=native['boundary'];surface.update(boundary=native['boundary'],rowFrontEdge={'coordinates':front},groundReference=middle,frontReference=[o[i]+reference.coords[0][i]/f[i] for i in range(2)],fenceMode='authored')
photo=review['physicalReferenceEvidence']['organizerCounterView']
surface['canopy']=dict(rearClearanceMetres=3,crownMetres=.6,postWidthMetres=.12,supportU=[0,.5,1],supportEdges=[[2,3],[1,0]],source=dict(url=photo['url'],checkedAt='2026-10-28',method='estimated',confidence='low',notes='Official Gold8 panorama confirms a covered stand; clearance3m, crown0.6m, square posts0.12m and three stations are estimates. Native plan, retained seating profile and estimated roof are separate evidence levels.'))
layer=read('src/circuits/barriers/spa-gold7.json');zone['requiredBarrierIds']=[b['id'] for b in layer['barriers']]
zone['availability']='available';zone['geometryReview']={'checkedAt':'2026-10-28','issues':[],'method':'Native east-roof footprint associated by the official Gold8 panorama and paired Gold7 view, with SPW2023 aerial ordering. Road, neighboring zones, current pit and building overlap zero; vertical dimensions estimated.'}
zone['source']=dict(url='https://www.openstreetmap.org/way/1366085153',checkedAt='2026-10-28',method='estimated',confidence='medium',notes='Gold8 physical association supported by two separately named organizer panoramas: neighboring uncovered bank lies left of Gold8 and right of Gold7. No named native ticket boundary or2026 survey. Native plan approximates seat footprint.')
zone['openingSource']=dict(url=review['annualIdentityEvidence']['url'],checkedAt='2026-10-28',method='published',confidence='medium',notes='January2026 organizer map lists Gold8 separately from Gold7/Bis/Ter; schematic product identity is not surveyed ticket geography.')
zone['surfaceSource']=surface['canopy']['source']
record=dict(circuitId='spa',season=2026,nativeStandWay=1366085153,oldZone=old,zone=zone,barrierLayer=layer,identityAccepted=True,runtimeApplied=False,sceneAcceptance={'accepted':False},geometryFingerprint=digest({k:data[k] for k in ['trackGeometry','corners','elevation']}),neighborFingerprint=digest(others),facilitiesFingerprint=digest(facilities),physicalReference=photo,sourceReview='src/circuits/season-review/spa-la-source-2026.json',roadIntersectionMetres2=0,otherZoneIntersections=conflicts,facilityReview={'renderedPitOverlapMetres2':polygon.intersection(pit).area,'buildingPlanOverlapMetres2':polygon.intersection(buildings).area},limits='Source-associated approximate footprint; original19 rows/9.6m rise/2.2m base and1.2m seated eyes retained. Roof and barrier heights estimated, panorama date and2026 construction continuity unverified. Bis/Ter not included.')
target.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
print('Prepared Gold8 east-roof footprint; zero current road, pit, building and neighbor overlaps; runtime unchanged.')
