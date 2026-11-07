"""Audit the actual rendered road triangles; never translate stands to hide errors.
Run export-spectator-audit.ts first. Retain rejected source polygons for review,
but do not expose them as simulated seating. Front references are geometric
estimates, not a claim that seating bearings have been surveyed.
"""
import json, math, sys
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union

root=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text(encoding='utf8'))
region=sys.argv[1] if len(sys.argv)>1 and sys.argv[1] in ['asia','americas'] else 'europe'
only=next((arg.split('=',1)[1] for arg in sys.argv[2:] if arg.startswith('--circuit=')),None)
destination=f'artifacts/{region}-spectators' if region!='europe' else 'artifacts/map-audit'
metric_records=read(f'{destination}/metric-geometry.json')
if only and only not in {r['id'] for r in metric_records}:raise ValueError(f'Unknown circuit audit target: {only}')
report=[]
names={}
boxparkReviewPath=root/'src/circuits/europe/silverstone-boxpark-2026.json'
boxparkHolds={a['zoneId']:a['newMetadata']['geometryReview']['issues'] for a in read(str(boxparkReviewPath.relative_to(root)))['areas'] if not a['geometryAccepted']} if boxparkReviewPath.exists() else {}
for record in metric_records:
    cid=record['id']; data=read(f'src/circuits/generated/{cid}.json')
    if only and cid!=only:continue
    origin=np.array(record['origin']); factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*record['calibration']
    road=unary_union([Polygon(t) for t in record['triangles']])
    line=LineString([(p[0],p[2]) for p in record['road']])
    for zone in data['spectatorZones']:
        names[(cid,zone['zoneId'])]=zone['name']
        issues=[]; details=[]
        for surface in zone['surfaces']:
            points=(np.array(surface['boundary'])-origin)*factor
            polygon=Polygon(points); center=points[:-1].mean(0); a=points[:-1]-center
            _,vectors=np.linalg.eigh(a.T@a); normal=vectors[:,0]
            depth=float(np.ptp(a@normal))
            # A badly conditioned local affine can collapse a diagram stand
            # into a sliver. Do not widen it or present impossible row spacing.
            if surface['rows']>1 and depth/(surface['rows']-1)<.6:
                issues.append(f"{surface['surfaceId']}: diagram footprint too shallow for configured rows ({depth:.2f}m depth)")
            nearest=np.array(line.interpolate(line.project(Point(center))).coords[0])
            angle=math.degrees(math.acos(np.clip(abs(normal@(nearest-center))/max(1e-8,np.linalg.norm(nearest-center)),0,1)))
            area=polygon.intersection(road).area
            if area>1e-6: issues.append(f"{surface['surfaceId']}: road intersection {area:.4f} m2")
            if surface['rows']>0 and zone['source']['method']=='estimated' and angle>60:
                issues.append(f"{surface['surfaceId']}: unresolved diagram bearing ({angle:.1f} degrees)")
            # Select the road across the broad face, rather than a closer road
            # behind the stand's end. Both signed normal rays are considered.
            crossing=line.intersection(LineString([center-normal*450,center+normal*450]))
            candidates=[g for g in getattr(crossing,'geoms',[crossing]) if g.geom_type=='Point']
            candidates=[p for p in candidates if p.distance(Point(center))>data['trackGeometry']['widthMetres']/2]
            if surface.get('rowStrip') or surface.get('rowFrontEdge'):
                # Source-authored fronts can be curved or skew. Do not replace
                # their reviewed road reference with a whole-building PCA ray.
                ref=surface.get('frontReference')
                if not ref or len(ref)!=2 or not np.isfinite(ref).all():issues.append(f"{surface['surfaceId']}: invalid authored front reference")
            elif surface.get('terrainFollow'):
                # Public ground already defaults to the nearest road in the
                # shared runtime. Audit, rather than invent/overwrite, a source
                # reference; GA has no seating face requiring a PCA direction.
                ref=surface.get('frontReference')
                if ref is not None and (len(ref)!=2 or not np.isfinite(ref).all()):issues.append(f"{surface['surfaceId']}: invalid ground view reference")
            elif candidates:
                target=np.array(min(candidates,key=lambda p:p.distance(Point(center))).coords[0])
                reference=(origin+target/factor).tolist()
                previous=surface.get('frontReference')
                # Keep an equivalent authored value across Float32 audit
                # exports (0.1mm), without accepting a changed bearing.
                if previous is None or np.linalg.norm((np.array(previous)-reference)*factor)>1e-4:surface['frontReference']=reference
            else:
                issues.append(f"{surface['surfaceId']}: no road across either seating face")
            details.append(dict(surfaceId=surface['surfaceId'],roadOverlapSquareMetres=round(area,3),nearestRoadObliquityDegrees=round(angle,2),frontReference=surface.get('frontReference')))
        if cid=='silverstone':issues+=boxparkHolds.get(zone['zoneId'],[])
        zone['availability']='preparing' if issues else 'available'
        zone['geometryReview']={'checkedAt':'2026-10-23','issues':issues,'method':'Rendered road triangle / full footprint intersection; broad-face road reference. Bearings and heights remain estimates.'}
        report.append(dict(circuitId=cid,zoneId=zone['zoneId'],availability=zone['availability'],issues=issues,surfaces=details))
    data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
    data['simulationAvailability']='available' if data['spectatorZoneIds'] else 'preparing'
    (root/f'src/circuits/generated/{cid}.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
summaries=read('src/circuits/generated/summaries.json')
for summary in summaries:
    if (not only or summary['circuitId']==only) and any(r['id']==summary['circuitId'] for r in read(f'{destination}/metric-geometry.json')):
        package=read(f"src/circuits/generated/{summary['circuitId']}.json")
        summary['spectatorZoneIds']=package['spectatorZoneIds']
        summary['simulationAvailability']=package['simulationAvailability']
(root/'src/circuits/generated/summaries.json').write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
previous=read(f'src/circuits/{region}/geometry-review.json') if only else []
merged=[r for r in previous if r['circuitId']!=only]+report if only else report
if only:
    circuit_order={r['id']:i for i,r in enumerate(read(f'{destination}/metric-geometry.json'))}
    zone_order={r['id']:{z['zoneId']:i for i,z in enumerate(read(f'src/circuits/generated/{r["id"]}.json')['spectatorZones'])} for r in read(f'{destination}/metric-geometry.json')}
    merged.sort(key=lambda r:(circuit_order[r['circuitId']],zone_order[r['circuitId']][r['zoneId']]))
(root/f'src/circuits/{region}/geometry-review.json').write_text(json.dumps(merged,ensure_ascii=False,indent=2),encoding='utf8')
markdown=[f'# {region.title()} spectator geometry review — 2026-10-23','',
          'This is geometric compatibility screening, not surveyed seating verification. Original footprints are retained; failed footprints are withheld, never moved to hide intersections.','',
          '| Circuit | Available approximate areas | Withheld |','| --- | ---: | ---: |']
for record in read(f'{destination}/metric-geometry.json'):
    if only and record['id']!=only:continue
    rows=[r for r in report if r['circuitId']==record['id']]
    markdown.append(f"| {record['id']} | {sum(r['availability']=='available' for r in rows)} | {sum(r['availability']=='preparing' for r in rows)} |")
    print(record['id'],sum(r['availability']=='available' for r in rows),'available,',sum(r['availability']=='preparing' for r in rows),'withheld')
markdown+=['','## Withheld source footprints','','| Circuit | Area | Reason |','| --- | --- | --- |']
for row in report:
    if row['availability']=='preparing':
        markdown.append(f"| {row['circuitId']} | {names[(row['circuitId'],row['zoneId'])]} | {'; '.join(row['issues'])} |")
(root/f'{destination}/REVIEW.md').write_text('\n'.join(markdown)+'\n',encoding='utf8')
