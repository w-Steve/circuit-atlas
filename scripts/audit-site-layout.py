"""Independent plan-view audit, not proof of seating or pit-route survey accuracy.

Checks retained available footprints against each other and all surface pit lanes,
and pit endpoints against the circuit / other pit segments. Shanghai's legacy
scene has its own tests; this script audits the 22 shared circuit data packages.
"""
import json,math,sys
from pathlib import Path
from shapely.geometry import Polygon,LineString,Point
ROOT=Path(__file__).resolve().parents[1];report=[]
for path in sorted((ROOT/'src/circuits/generated').glob('*.json')):
    data=json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(data,dict) or not data.get('circuitId') or data['circuitId']=='shanghai':continue
    cid=data['circuitId'];origin=data['trackGeometry']['coordinates'][0]
    sx=111320*math.cos(math.radians(origin[1]));sy=111320
    xy=lambda c:((c[0]-origin[0])*sx,(c[1]-origin[1])*sy)
    road=LineString([xy(c) for c in data['trackGeometry']['coordinates']]);surfaces=[];issues=[]
    for z in data['spectatorZones']:
        if z['availability']!='available':continue
        for s in z.get('surfaces',[]):surfaces.append((z['zoneId'],s['surfaceId'],Polygon([xy(c) for c in s['boundary']])))
    ground=[(s['surfaceId'],Polygon([xy(c) for c in s['boundary']])) for z in data['spectatorZones'] if z['availability']=='available' for s in z.get('surfaces',[]) if s.get('terrainFollow')]
    waterpath=ROOT/f'src/circuits/water/{cid}.json'
    if ground and waterpath.exists():
        water=json.loads(waterpath.read_text('utf8'))
        for name,a in ground:
            for feature in water['features']:
                rings=feature['rings'];area=a.intersection(Polygon([xy(c) for c in rings[0]],[[xy(c) for c in ring] for ring in rings[1:]])).area
                if area>.05:issues.append({'kind':'public-ground-water','a':name,'b':feature['id'],'areaMetres2':round(area,3)})
    for i,(name,a) in enumerate(ground):
        for other,b in ground[i+1:]:
            area=a.intersection(b).area
            if area>.05:issues.append({'kind':'public-ground-overlap','a':name,'b':other,'areaMetres2':round(area,3)})
    facpath=ROOT/f'src/circuits/facilities/{cid}.json'
    facilities=json.loads(facpath.read_text(encoding='utf-8')) if facpath.exists() else {'pitLanes':[]}
    def lane_area(lane):
        if lane.get('surfaceBoundary'):
            from shapely.ops import unary_union
            return unary_union([Polygon([xy(c) for c in rings[0]],[[xy(c) for c in ring] for ring in rings[1:]]) for rings in lane['surfaceBoundary']])
        return LineString([xy(c) for c in lane['coordinates']]).buffer(lane['widthMetres']/2)
    for i,(za,sa,a) in enumerate(surfaces):
        for zb,sb,b in surfaces[i+1:]:
            if za==zb:continue
            area=a.intersection(b).area
            if area>.05:issues.append({'kind':'stand-stand','a':sa,'b':sb,'areaMetres2':round(area,3)})
        for lane in facilities['pitLanes']:
            if lane.get('underground'):continue
            area=a.intersection(lane_area(lane)).area
            if area>.05:issues.append({'kind':'stand-pit','a':sa,'b':lane['id'],'areaMetres2':round(area,3)})
        for b in facilities.get('buildings',[]):
            area=a.intersection(Polygon([xy(c) for c in b['boundary']])).area
            if area>.05:issues.append({'kind':'stand-building','a':sa,'b':b['id'],'areaMetres2':round(area,3)})
    for lane in facilities['pitLanes']:
        if not lane.get('underground'):
            for b in facilities.get('buildings',[]):
                area=lane_area(lane).intersection(Polygon([xy(c) for c in b['boundary']])).area
                if area>.05:issues.append({'kind':'pit-building','a':lane['id'],'b':b['id'],'areaMetres2':round(area,3)})
        coords=lane['coordinates']
        for label,point,a,b in [('entry',coords[0],coords[0],coords[1]),('exit',coords[-1],coords[-2],coords[-1])]:
            q=Point(xy(point));d=road.distance(q)
            other=min([Point(xy(p)).distance(q) for l in facilities['pitLanes'] if l['id']!=lane['id'] for p in [l['coordinates'][0],l['coordinates'][-1]]]+[float('inf')])
            if min(d,other)>12:issues.append({'kind':'disconnected-pit-end','lane':lane['id'],'end':label,'distanceMetres':round(min(d,other),2)})
            if d>3:continue
            s=road.project(q);r0=road.interpolate((s-2)%road.length);r1=road.interpolate((s+2)%road.length)
            x0,y0=xy(a);x1,y1=xy(b);dx=x1-x0;dy=y1-y0;tx=r1.x-r0.x;ty=r1.y-r0.y
            dot=(dx*tx+dy*ty)/math.hypot(dx,dy)/math.hypot(tx,ty)
            if dot<-.1:issues.append({'kind':'pit-opposes-race-direction','lane':lane['id'],'end':label,'dot':round(dot,3)})
    report.append({'circuitId':cid,'surfaces':len(surfaces),'pitSegments':len(facilities['pitLanes']),'issues':issues})
result={'checkedAt':'2026-10-24','scope':'Planar source footprints, not a 3D structural clearance or complete 2026 inventory certification; road/fence mesh regressions and FIA map review are separate.','circuits':report}
destination=ROOT/'artifacts/goal-review/site-layout.json';destination.parent.mkdir(parents=True,exist_ok=True);destination.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
count=sum(len(r['issues']) for r in report)
print(f'{len(report)} circuits / {sum(r["surfaces"] for r in report)} surfaces / {count} layout conflicts')
for r in report:
    if r['issues']:print(r['circuitId'],json.dumps(r['issues']))
if '--check' in sys.argv and count:raise SystemExit(1)
