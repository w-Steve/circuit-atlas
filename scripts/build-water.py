"""Derive clipped water surfaces from retained OSM ways/relations, never DEM colours.

Coastlines have land on their left. Polygonized faces are classified using the
nearest oriented coastline segment. Lake islands remain holes. Raw OSM stays local.
Water levels are explicitly DEM estimates, not surveyed or tidal measurements.
"""
import json, math, statistics, xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import polygonize, unary_union

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'src/circuits/water';OUT.mkdir(exist_ok=True)
def polygons(g):
    if g.geom_type=='Polygon': return [g]
    return [p for q in getattr(g,'geoms',[]) for p in polygons(q)]
for f in sorted((ROOT/'src/circuits/generated').glob('*.json')):
    d=json.loads(f.read_text(encoding='utf-8'))
    if not isinstance(d,dict):continue
    cid=d.get('circuitId')
    if cid=='shanghai':continue  # Legacy Shanghai scene retains its physical flat datum.
    if not cid or not d.get('elevation',{}).get('grid'):continue
    candidates=list((ROOT/'research').glob(f'**/{cid}-osm.xml'))
    if not candidates:continue
    raw=candidates[0];r=ET.parse(raw).getroot()
    # Bbox extracts omit distant members of large reservoirs/rivers. Supplement
    # only complete original OSM relations retained from the public /full API.
    extra=list((ROOT/'research/season-review').glob(f'water-{cid}-*.xml'))
    existing={(e.tag,e.get('id')) for e in r}
    for path in extra:
        for e in ET.parse(path).getroot():
            if (e.tag,e.get('id')) not in existing:r.append(e);existing.add((e.tag,e.get('id')))
    nodes={n.get('id'):(float(n.get('lon')),float(n.get('lat'))) for n in r.findall('node')}
    ways={w.get('id'):w for w in r.findall('way')}
    def tags(e):return {t.get('k'):t.get('v') for t in e.findall('tag')}
    def coords(w):
        ids=[n.get('ref') for n in w.findall('nd')]
        return [nodes[i] for i in ids] if all(i in nodes for i in ids) else []
    grid=d['elevation']['grid'];bounds=grid['bounds'];clip=box(*bounds)
    sx=111320*math.cos(math.radians((bounds[1]+bounds[3])/2));sy=111320
    def height(lon,lat):
        n=grid['size'];x=max(0,min(n-1,(lon-bounds[0])/(bounds[2]-bounds[0])*(n-1)));y=max(0,min(n-1,(lat-bounds[1])/(bounds[3]-bounds[1])*(n-1)))
        i=min(n-2,int(x));j=min(n-2,int(y));a=x-i;b=y-j;h=grid['heights']
        return (h[j*n+i]*(1-a)+h[j*n+i+1]*a)*(1-b)+(h[(j+1)*n+i]*(1-a)+h[(j+1)*n+i+1]*a)*b
    surfaces=[]
    def add(poly,ids,kind):
        for p in polygons(poly.intersection(clip)):
            if p.area*sx*sy<80:continue
            # Median of source cells strictly inside water rejects shore mixing.
            samples=[];n=grid['size']
            for y in range(n):
                lat=bounds[1]+(bounds[3]-bounds[1])*y/(n-1)
                for x in range(n):
                    lon=bounds[0]+(bounds[2]-bounds[0])*x/(n-1)
                    if p.contains(Point(lon,lat)):samples.append(height(lon,lat))
            q=p.representative_point();level=statistics.median(samples) if samples else height(q.x,q.y)
            # Ocean zero is a visualization datum; tides/geoid are not measured.
            level_source='https://zenodo.org/records/18887460'
            if kind=='sea':
                level=0
                level_source='https://wiki.openstreetmap.org/wiki/Tag:natural%3Dcoastline'
                if cid=='baku':
                    # The global DEM fills offshore Caspian cells near +1 m,
                    # producing a fictitious 30 m cliff. Use published basin level,
                    # explicitly a 2025 regional datum, not a 2026 Baku tide gauge.
                    level=-29.4
                    level_source='https://www.ocean.ru/en/index.php/novosti-instituta/1268-caspian-sea-day-why-the-unique-body-of-water-is-drying-up'
            rings=[list(p.exterior.coords)]+[list(h.coords) for h in p.interiors]
            surfaces.append({'id':f'{kind}-{len(surfaces)}','kind':kind,'rings':[[[round(x,8),round(y,8)] for x,y in ring] for ring in rings],
                'altitudeMetres':round(level,3),'levelEstimated':True,'levelSource':level_source,'sources':[f'https://www.openstreetmap.org/{i}' for i in ids]})
    used=set()
    for rel in r.findall('relation'):
        t=tags(rel)
        if t.get('natural')!='water' and t.get('waterway')!='riverbank' and t.get('landuse')!='reservoir':continue
        members=rel.findall('member');outer=[];inner=[];ok=True
        for m in members:
            if m.get('type')!='way':continue
            w=ways.get(m.get('ref'));c=coords(w) if w is not None else []
            if len(c)<2:ok=False;break
            (inner if m.get('role')=='inner' else outer).append(LineString(c))
        if not ok:continue
        shell=unary_union(list(polygonize(unary_union(outer))));holes=unary_union(list(polygonize(unary_union(inner))))
        if shell.is_empty:continue
        add(shell.difference(holes),[f'relation/{rel.get("id")}'],'inland')
        used.update(m.get('ref') for m in members if m.get('type')=='way')
    coasts=[];segments=[];coastids=[]
    for wid,w in ways.items():
        t=tags(w);c=coords(w)
        if len(c)<2:continue
        if t.get('natural')=='coastline':
            coasts.append(LineString(c).intersection(clip));coastids.append(f'way/{wid}')
            segments.extend((a,b) for a,b in zip(c,c[1:]) if a!=b)
        elif wid not in used and (t.get('natural')=='water' or t.get('waterway')=='riverbank' or t.get('landuse')=='reservoir') and c[0]==c[-1]:
            p=Polygon(c)
            if p.is_valid:add(p,[f'way/{wid}'],'inland')
    if coasts:
        for p in polygonize(unary_union([clip.boundary,*coasts])):
            q=p.representative_point();best=None
            for a,b in segments:
                ax=(a[0]-q.x)*sx;ay=(a[1]-q.y)*sy;dx=(b[0]-a[0])*sx;dy=(b[1]-a[1])*sy
                t=max(0,min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy)));dist=(ax+t*dx)**2+(ay+t*dy)**2
                if best is None or dist<best[0]:best=(dist,dx*(-ay)-dy*(-ax))
            if best and best[1]<0:add(p,coastids,'sea')
    if surfaces:
        if cid=='singapore':
            # Singapore River and Marina Bay are one connected freshwater
            # reservoir. Separate coarse DEM medians created a fictitious ~4m
            # water step that submerged Esplanade Bridge. Pool the source cells
            # once; retain all shoreline geometry and identify this as estimated.
            connected=[f for f in surfaces if any(s.endswith('/9542146') or s.endswith('/9569901') for s in f['sources'])]
            if len(connected)!=2:raise ValueError('Recheck Marina reservoir source relations')
            basin=unary_union([Polygon(f['rings'][0],f['rings'][1:]) for f in connected])
            values=[grid['heights'][r*grid['size']+c] for r in range(grid['size']) for c in range(grid['size'])
                    if basin.contains(Point(bounds[0]+(bounds[2]-bounds[0])*c/(grid['size']-1),bounds[1]+(bounds[3]-bounds[1])*r/(grid['size']-1)))]
            level=round(statistics.median(values),3)
            for feature in connected:
                feature['altitudeMetres']=level
                feature['levelMethod']='One connected Marina Reservoir/Singapore River surface; median of all native ground-model samples inside the combined shoreline. Not a surveyed water gauge or bridge deck.'
                feature['hydrologySource']='https://www.pub.gov.sg/public/places-of-interest/marina-barrage'
        result={'circuitId':cid,'checkedAt':'2026-10-24','license':'ODbL-1.0','features':surfaces,
            'notes':'OSM shoreline/water polygons, clipped to terrain extent; islands retained. Ocean datum 0 m; inland level median GEDTM30 source pixels within water (estimated, not a water survey). Caspian Sea -29.4 m from Institute of Oceanology 2025 basin value, not a 2026 Baku gauge, datum alignment approximate; offshore DEM values rejected. Terrain-only mask; no changes to track, spectator, camera or car coordinates.'}
        (OUT/f'{cid}.json').write_text(json.dumps(result,separators=(',',':'))+'\n',encoding='utf-8')
    print(cid,len(surfaces))
