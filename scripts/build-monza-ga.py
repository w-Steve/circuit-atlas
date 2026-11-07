"""Interpret the six P/Circolare Prato strokes on the organizer 2026 map.
Requires freshly exported metric geometry (export-spectator-audit.ts europe).
Only factual coordinates/metadata are retained, not the PDF or its artwork.
"""
import json, math, hashlib
from pathlib import Path
import fitz
import numpy as np
from scipy.spatial import Delaunay
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union, triangulate, nearest_points
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
url='https://www.monzanet.it/wp-content/uploads/2026/06/GP_F1_2026_LISTINO_PREZZI_6_17.pdf'
raw=(ROOT/'research/season-review/monza-2026-rechecked.pdf').read_bytes()
sha=hashlib.sha256(raw).hexdigest()
if sha!='e329a9c80037914143c3ba3fdb79e61352aa0ebdb82d4dbc7f645a92a17294d2':raise ValueError('Source PDF changed: recheck the map paths and controls')
data=read('src/circuits/generated/monza.json')
metric=next(x for x in read('artifacts/map-audit/metric-geometry.json') if x['id']=='monza')
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
# PDF point coordinates, not screenshot pixels. The unnumbered broad Curva
# Grande sweep has no unambiguous T3 apex; do not invent a control there.
controls={1:[424,637],2:[422,623],4:[201,377],5:[187,369],6:[158,246],7:[269,227],8:[502,528],9:[531,529],10:[556,549],11:[926,622]}
pixels=np.array(list(controls.values()),dtype=float)
world=(np.array([next(c['coordinate'] for c in data['corners'] if c['number']==n) for n in controls])-origin)*factor
fit=np.linalg.lstsq(np.c_[pixels,np.ones(len(pixels))],world,rcond=None)[0]
residuals=np.linalg.norm(np.c_[pixels,np.ones(len(pixels))]@fit-world,axis=1)
pad=np.array([[0,100],[1190,100],[1190,840],[0,840]],dtype=float)
points=np.r_[pixels,pad];values=np.r_[world,np.c_[pad,np.ones(4)]@fit];tri=Delaunay(points)
jacobians=[float(np.linalg.det(np.c_[values[t],np.ones(3)])/np.linalg.det(np.c_[points[t],np.ones(3)])) for t in tri.simplices]
if min(jacobians)<=0:raise ValueError('Registration folds; revise independent controls before interpreting ground')
def register(p):
    k=int(tri.find_simplex(p))
    if k<0:raise ValueError('Source boundary outside padded registration envelope')
    t=tri.simplices[k]
    return np.r_[p,1]@np.linalg.solve(np.c_[points[t],np.ones(3)],values[t])
def trace(drawing):
    out=[]
    for item in drawing['items']:
        if item[0]=='l':out.extend([np.array(item[1]),np.array(item[2])])
        elif item[0]=='c':
            a,b,c,d=[np.array(x) for x in item[1:]]
            out.extend((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d for t in np.linspace(0,1,64))
        else:raise ValueError('Unexpected source path primitive')
    return [p.tolist() for p in out]
def densify(coords):
    result=[]
    for a,b in zip(coords,coords[1:]):
        a,b=np.array(a),np.array(b);n=max(1,math.ceil(np.linalg.norm(b-a)/2))
        result.extend((a+(b-a)*i/n).tolist() for i in range(n))
    result.append(list(coords[-1]));return result
def polygons(shape):
    if shape.geom_type=='Polygon':return [shape]
    return [p for g in getattr(shape,'geoms',[]) for p in polygons(g)]

road=unary_union([Polygon(t) for t in metric['triangles']]);roadLine=LineString([[p[0],p[2]] for p in metric['road']]);objects=[]
for z in data['spectatorZones']:
    if z['zoneId'].startswith('prato-'):continue
    objects.extend(Polygon((np.array(s['boundary'])-origin)*factor) for s in z.get('surfaces',[]))
for b in data.get('facilities',{}).get('buildings',[]):objects.append(Polygon((np.array(b['boundary'])-origin)*factor))
for lane in data.get('facilities',{}).get('pitLanes',[]):
    if not lane.get('underground'):objects.append(LineString((np.array(lane['coordinates'])-origin)*factor).buffer(lane['widthMetres']/2))
water=[];waterPath=ROOT/'src/circuits/water/monza.json'
if waterPath.exists():
    for f in json.loads(waterPath.read_text('utf8'))['features']:
        water.append(Polygon((np.array(f['rings'][0])-origin)*factor,[(np.array(r)-origin)*factor for r in f['rings'][1:]]))
occupied=unary_union([road.buffer(.75),unary_union(objects).buffer(.5),unary_union(water).buffer(.5)])
page=fitz.open(stream=raw,filetype='pdf')[0];drawings=page.get_drawings();zones=[];areas=[]
def provenance(method,confidence,notes):return dict(url=url,checkedAt='2026-10-25',method=method,confidence=confidence,notes=notes)
for index,id,name in [(288,'prato-lesmo-2','Prato · 莱斯莫 2 草地'),(289,'prato-serraglio','Prato · 塞拉廖草地'),(290,'prato-lesmo','Prato · 莱斯莫草地'),(291,'prato-biassono','Prato · 比亚索诺草地'),(292,'prato-prima-variante','Prato · 第一减速弯草地'),(293,'prato-parabolica','Prato · 帕拉波利卡草地')]:
    drawing=drawings[index];width=drawing.get('width') or 0
    if not 12<width<12.5 or drawing.get('fill') is not None:raise ValueError('Recheck P stroke identity')
    line=trace(drawing);pdf=LineString(line).buffer(width/2,cap_style=1,join_style=1)
    ring=densify(list(pdf.exterior.coords));mapped=Polygon([register(p) for p in ring])
    if not mapped.is_valid:raise ValueError('Source registration produced an invalid ground boundary')
    usable=mapped.difference(occupied);parts=[];omitted=0
    if usable.is_empty:raise ValueError(f'{id}: no source ground remains; do not expose a placeholder')
    for x in range(math.floor(usable.bounds[0]/100),math.ceil(usable.bounds[2]/100)):
        for y in range(math.floor(usable.bounds[1]/100),math.ceil(usable.bounds[3]/100)):
            for part in polygons(usable.intersection(box(x*100,y*100,(x+1)*100,(y+1)*100))):
                pieces=[part] if not part.interiors else [p for t in triangulate(part) for p in polygons(t.intersection(part))]
                for p in pieces:
                    if p.interiors:raise ValueError('Public-ground hole requires a finer explicit partition')
                    if p.area<4:omitted+=p.area;continue
                    parts.append(p.simplify(.1,preserve_topology=True))
    surfaces=[]
    for i,p in enumerate(parts):
        ref=roadLine.interpolate(roadLine.project(p.centroid));front=(origin+np.array([ref.x,ref.y])/factor).tolist()
        surfaces.append(dict(surfaceId=f'{id}-{i+1}',boundary=(origin+np.array(p.exterior.coords)/factor).tolist(),baseHeight=.04,rise=0,eyeHeight=1.2,rows=0,terrainFollow=True,frontReference=front))
    if not surfaces:raise ValueError('No valid selection patches')
    # The printed P symbol is a semantic entrance cue, not a surveyed seat.
    # Project it into the nearest source-ground patch by distance only; do not
    # search for visible rays or let the order of computational tiles pick it.
    markerIndex={288:297,289:299,290:295,291:301,292:303,293:305}[index]
    rect=drawings[markerIndex]['rect'];markerPdf=[(rect.x0+rect.x1)/2,(rect.y0+rect.y1)/2]
    markerWorld=Point(register(markerPdf))
    # P glyph circles extend beyond the green stroke: their centre is a label,
    # not a physical visitor standing on its border. Start on the stroke's
    # centreline nearest that label, then project only for computational seams.
    strokeCentre=nearest_points(Point(markerPdf),LineString(line))[1]
    preferred=Point(register([strokeCentre.x,strokeCentre.y]));entryIndex=min(range(len(parts)),key=lambda i:parts[i].distance(preferred))
    safe=parts[entryIndex].buffer(-.05)
    if safe.is_empty:raise ValueError('Source entry patch is too narrow')
    entry=nearest_points(preferred,safe)[1];entryGeo=(origin+np.array([entry.x,entry.y])/factor).tolist()
    zone=dict(zoneId=id,name=name,kind='general-admission',availability='available',boundary=surfaces[0]['boundary'],surface=dict(baseHeight=.04,rise=0,depth=0,eyeHeight=1.2),surfaces=surfaces,
        defaultViewpoint=dict(surfaceId=surfaces[entryIndex]['surfaceId'],coordinate=entryGeo,source=provenance('estimated','low','Initial position on the green Prato stroke centreline nearest the official diagram P label, projected by distance into its registered ground patch with0.05m numerical inset. Glyph circles extend outside the stroke and are not physical seat coordinates. Not a surveyed seat or a visibility guarantee. No raycast-based location optimization; all ground remains freely selectable, and remembered user positions take precedence.')),
        source=provenance('estimated','low','Organizer2026 map P stroke interpreted by ten manually identified turn controls and piecewise affine registration, with global affine continuation outside their hull. Schematic map, not cadastral boundary. Regional names distinguish geographic portions of the same P ticket, not separate ticket products. Known rendered road+0.75m and stand/building/pit/water+0.5m excluded. <=100m computational patches preserve continuous picking; boundary simplification0.1m; tiny <4m2 remnants omitted. Trees, screens and actual spectator density are not surveyed.'),
        openingSource=provenance('published','high','Official2026 grandstand map marks six green P/Circolare Prato strips; official2026 price tables separately list P/General Admission. Same ordinary admission family, separate from numbered grandstands and unnumbered GF terraces.'),
        surfaceSource=provenance('estimated','low','Ground follows regional GEDTM30 v1.2 at true vertical scale, <=8m mesh edges. Clearance0.04m and seated eye1.2m; no invented rows, berm heights or exaggerated terrain. Regional model cannot resolve local paths, fences, trees, earthworks or all sightline obstructions.'),
        geometryReview=dict(checkedAt='2026-10-25',issues=[],method='Registered source P stroke clipped against known road/stand/building/pit/water geometry. Independent finite eye/mesh, 3D ray and actual photograph checks remain required; plan-view clearance is not a full view guarantee.'))
    zones.append(zone);areas.append(dict(zoneId=id,pdfPath=index,strokeWidthPoints=width,pdfLine=line,pdfBoundary=ring,sourceGeographicBoundary=(origin+np.array(mapped.exterior.coords)/factor).tolist(),mappedAreaMetres2=mapped.area,excludedAreaMetres2=max(0,mapped.area-usable.area),omittedSmallAreaMetres2=omitted,patches=len(surfaces),entryMarkerPath=markerIndex,entryMarkerPdf=markerPdf,entryProjectionDistanceMetres=entry.distance(markerWorld)))
    print(id,'source',round(mapped.area,1),'excluded',round(max(0,mapped.area-usable.area),1),'patches',len(surfaces))
record=dict(circuitId='monza',season=2026,checkedAt='2026-10-25',source=url,sourcePdfSha256=sha,sourcePage=0,sourcePageSize=list(page.rect),ticketFamily='P / Circolare Prato / General Admission',
    controls=controls,geographicControls=[c for c in data['corners'] if c['number'] in controls],metricFrame=dict(origin=origin.tolist(),calibration=metric['calibration'],axes='x east / z south; metres'),boundarySimplificationToleranceMetres=.1,excludedControl=dict(number=3,reason='Broad unnumbered Curva Grande sweep has no unambiguous diagram apex; a guessed point folds the registration. Do not invent a landmark just to fill all turn numbers.'),
    registration=dict(method='Piecewise affine using ten unambiguous manually identified turns, padded by global affine continuation',globalAffineMatrix=fit.tolist(),globalAffineResidualsMetres=residuals.tolist(),globalAffineRmsMetres=float(np.sqrt(np.mean(residuals**2))),minJacobianDeterminant=min(jacobians),limitation='Internal exact interpolation is not external accuracy. Schematic boundaries and source control uncertainty can produce tens-of-metres placement errors; local seat-view survey remains unavailable.'),areas=areas,zones=zones)
(ROOT/'src/circuits/europe/monza-general-admission.json').write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print('Affine RMS',round(record['registration']['globalAffineRmsMetres'],2),'m; no registration fold')
