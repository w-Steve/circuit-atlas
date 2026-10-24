"""Correct recorded intersections of estimated footprints without moving seats.

Run after regional source/audit builders. Original factual source URLs remain.
Only explicitly listed low-confidence estimates can be trimmed; fail on holes,
large changes, exact footprints or missing references rather than hiding an error.
"""
import json,math
from pathlib import Path
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text(encoding='utf-8'))
rules=read('src/circuits/season-review/footprint-constraints.json');report=[]
for rule in rules['constraints']:
    cid=rule['circuitId'];path=f'src/circuits/generated/{cid}.json';d=read(path)
    origin=d['trackGeometry']['coordinates'][0];sx=111320*math.cos(math.radians(origin[1]));sy=111320
    def xy(c):return ((c[0]-origin[0])*sx,(c[1]-origin[1])*sy)
    def geo(c):return [c[0]/sx+origin[0],c[1]/sy+origin[1]]
    zone=next(z for z in d['spectatorZones'] if z['zoneId']==rule['zoneId'])
    if zone['source']['method']!='estimated' or zone['source']['confidence']!='low':raise ValueError('Do not trim a verified footprint')
    if 'keepZoneId' in rule:
        keep=next(z for z in d['spectatorZones'] if z['zoneId']==rule['keepZoneId'])
        obstacle=unary_union([Polygon([xy(c) for c in s['boundary']]) for s in keep['surfaces']])
    else:
        lane=next(l for l in read(f'src/circuits/facilities/{cid}.json')['pitLanes'] if l['id']==rule['keepPitLaneId'])
        obstacle=LineString([xy(c) for c in lane['coordinates']]).buffer(lane['widthMetres']/2)
    obstacle=obstacle.buffer(rule['gapMetres']);surfaces=[];removed=0
    for s in zone['surfaces']:
        original=Polygon([xy(c) for c in s['boundary']]);fixed=original.difference(obstacle);removed+=original.area-fixed.area
        if fixed.geom_type!='Polygon' or fixed.interiors or fixed.area<original.area*.6:raise ValueError(f'{cid}/{zone["zoneId"]}: needs source review, not automatic trimming')
        if original.area-fixed.area>1e-5:s={**s,'boundary':[geo(c) for c in fixed.exterior.coords]}
        surfaces.append(s)
    zone['surfaces']=surfaces
    if len(surfaces)==1:zone['boundary']=surfaces[0]['boundary']
    if removed>1e-5:
        note=' Boundary constrained 2026-10-24: '+rule['reason']+' Approximate boundary; no seat translation or eye-height changes.'
        if note not in zone['source']['notes']:zone['source']['notes']+=note
        zone['geometryReview']={'checkedAt':rules['checkedAt'],'issues':[],'method':rules['method']+' '+rule['reason']}
        (ROOT/path).write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    report.append({'circuitId':cid,'zoneId':rule['zoneId'],'removedSquareMetres':round(removed,3),'source':zone['source']['url'],'reason':rule['reason']})
(ROOT/'artifacts/goal-review/footprint-corrections.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
for r in report:print(r['circuitId'],r['zoneId'],r['removedSquareMetres'])
