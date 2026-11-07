"""Register the official 2026 Lusail Hill diagram; no artwork is distributed.
Requires the locally retained source PNG and freshly exported metric road triangles
(node node_modules/vite-node/vite-node.mjs scripts/export-spectator-audit.ts asia).
The diagram is schematic: matching corner controls is NOT survey precision.
"""
import json, math, hashlib
from pathlib import Path
import numpy as np
from scipy.spatial import Delaunay
from shapely.geometry import Polygon, LineString, box
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
data=read('src/circuits/generated/lusail.json')
metric=next(x for x in read('artifacts/asia-spectators/metric-geometry.json') if x['id']=='lusail')
origin=np.array(metric['origin']);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])*metric['calibration']
# Explicitly traced centerline turn apexes, in a 1500px-wide source review.
controls=[[535,748],[553,616],[432,597],[283,448],[352,398],[471,478],[439,319],[518,341],[614,374],[656,465],[739,377],[756,221],[850,175],[948,239],[918,375],[1125,500]]
pixels=np.array(controls,dtype=float)
world=(np.array([next(c['coordinate'] for c in data['corners'] if c['number']==i+1) for i in range(16)])-origin)*factor
fit=np.linalg.lstsq(np.c_[pixels,np.ones(16)],world,rcond=None)[0]
errors=np.linalg.norm(np.c_[pixels,np.ones(16)]@fit-world,axis=1)
pad=np.array([[50,50],[1400,50],[1400,950],[50,950]])
points=np.r_[pixels,pad];values=np.r_[world,np.c_[pad,np.ones(4)]@fit];tri=Delaunay(points)
def register(p):
    index=int(tri.find_simplex(p))
    if index<0:raise ValueError('Outside registration envelope')
    ids=tri.simplices[index]
    return np.r_[p,1]@np.linalg.solve(np.c_[points[ids],np.ones(3)],values[ids])

boundary=[[402,719],[465,694],[472,704],[448,735],[461,765],[425,779],[410,750],[402,719]]
source=Polygon([register(p) for p in boundary])
road=unary_union([Polygon(t) for t in metric['triangles']]);objects=[]
for z in data['spectatorZones']:
    if z['zoneId']=='lusail-hill':continue
    for s in z.get('surfaces',[]):objects.append(Polygon((np.array(s['boundary'])-origin)*factor))
for b in data.get('facilities',{}).get('buildings',[]):objects.append(Polygon((np.array(b['boundary'])-origin)*factor))
for lane in data.get('facilities',{}).get('pitLanes',[]):
    if not lane.get('underground'):objects.append(LineString((np.array(lane['coordinates'])-origin)*factor).buffer(lane['widthMetres']/2))
occupied=unary_union([road.buffer(.75),unary_union(objects).buffer(.5)])
usable=source.difference(occupied)
parts=[]
for x in range(math.floor(usable.bounds[0]/100),math.ceil(usable.bounds[2]/100)):
    for y in range(math.floor(usable.bounds[1]/100),math.ceil(usable.bounds[3]/100)):
        area=usable.intersection(box(x*100,y*100,(x+1)*100,(y+1)*100))
        for p in getattr(area,'geoms',[area]):
            if p.geom_type=='Polygon' and p.area>=4:
                if p.interiors:raise ValueError('Partition source holes before exposing public ground')
                parts.append((origin+np.array(p.simplify(.1,preserve_topology=True).exterior.coords)/factor).tolist())
url='https://www.lcsc.qa/sites/default/files/2026-08/eventmap.png'
def provenance(url,method,confidence,notes):return dict(url=url,checkedAt='2026-10-25',method=method,confidence=confidence,notes=notes)
surfaces=[dict(surfaceId=f'lusail-hill-{i+1}',boundary=p,baseHeight=.04,rise=0,eyeHeight=1.2,rows=0,terrainFollow=True,frontReference=data['corners'][0]['coordinate']) for i,p in enumerate(parts)]
zone=dict(zoneId='lusail-hill',name='Lusail Hill 普通观赛区',kind='general-admission',availability='preparing',boundary=parts[0],surface=dict(baseHeight=.04,rise=0,depth=0,eyeHeight=1.2),surfaces=surfaces,
 source=provenance(url,'estimated','low','Official event map linked from the organizer 2026 Grand Prix page. Hill viewing footprint manually traced separately from the surrounding blue Fan Zone and gold Hill Lounge. Piecewise-affine registration to 16 sourced turn coordinates, with affine continuation outside the hull. Schematic 3D artwork is not a survey; local placement may differ by tens of metres. Known road+0.75m and structure/pit+0.5m exclusions. 100m patches are computational partitions, not ticket sectors.'),
 openingSource=provenance('https://www.lcsc.qa/faq/formula-1r-qatar-airways-qatar-grand-prix-2026','published','high','Organizer explicitly identifies General Admission Lusail Hill as the elevated Turn1 viewing area for 27–29 November2026. Ordinary public GA, not the separately sold Hill Lounge hospitality product.'),
 surfaceSource=provenance(url,'estimated','low','Regional GEDTM30 v1.2 terrain at true vertical scale; no invented hill height or exaggerated grade. 0.04m mesh clearance and seated eye1.2m. The ~30m predicted terrain cannot resolve constructed terraces or individual viewing platforms; their precise geometry remains unavailable.'),
 geometryReview=dict(checkedAt='2026-10-25',issues=['Constructed Hill terraces and retaining-wall elevations are absent from the regional DTM; source placement and constructed profile require independent validation. Partial photo occlusion alone does not prove a model error.'],method='Candidate only: source-ground patches exclude known roads, pit lanes and recorded structures. Planar clearance does not certify a usable viewing elevation. No terrain flattened, eye raised or boundary trimmed to pass sightline tests.'))
raw=(ROOT/'research/season-review/lusail2026/eventmap.png').read_bytes()
if hashlib.sha256(raw).hexdigest()!='dd7252b59d0c733e65c0a5a7346ecbb1117b4093c269a0d8cec694532f2eb577':raise ValueError('Source image changed; recheck the traced geometry before rebuilding')
record=dict(circuitId='lusail',season=2026,checkedAt='2026-10-25',sourceUrl=url,sourceSha256=hashlib.sha256(raw).hexdigest(),sourceImageSize=[2050,1368],coordinateReviewWidth=1500,
 sourcePixels=controls,controlNumbers=list(range(1,17)),sourceBoundary=boundary,registration=dict(method='Piecewise affine with padded global-affine continuation',globalAffineMatrix=fit.tolist(),globalAffineResidualsMetres=errors.tolist(),globalAffineRmsMetres=float(np.sqrt(np.mean(errors**2))),limitation='Control interpolation has zero internal residual by construction; it is not external validation. Elevation/perspective of the source artwork and manually traced apexes cause unresolved tens-of-metres placement uncertainty.'),
 sourceGeographicBoundary=(origin+np.array(source.exterior.coords)/factor).tolist(),sourceAreaMetres2=source.area,excludedAreaMetres2=source.area-usable.area,
 visibilityReview=dict(checkedAt='2026-10-25',samples=9,terrainIntersections=1,knownSample=dict(u=.5,v=.95,obstacle='lusail-hill-5'),browserPhotoResult='Historical 1.2m seated-eye candidate failed the former three-device visible-car threshold; this is not current standing-eye acceptance or proof of incorrect terrain.',limitation='A low eye line intersects the retained regional ground surface. This is not certified as an accurate constructed-terrace occlusion; no terrain was flattened, eye raised, or source region trimmed to suppress it. Detailed hill survey remains unavailable.'),
 structuralPhoto=dict(url='https://www.lcsc.qa/sites/default/files/2025-11/General%20Admission_main%20image.jpg',checkedAt='2026-10-25',sha256='975de150e270679419db72cbac1c22a80c66f9b253d4e46921df7e6fa8bd545e',observation='Organizer2026 ticket product uses this 4928x3280 photograph. It shows terraced grass platforms, retaining walls and stairs; proves a bare regional DTM is inadequate, but does not provide surveyed height controls. No numerical wall height inferred from a photo or sightline.'),zones=[zone])
# Retain a later browser review only when its source and boundary are unchanged.
previousPath=ROOT/'src/circuits/asia/lusail-general-admission.json'
if previousPath.exists():
    previous=json.loads(previousPath.read_text('utf8'))
    if previous.get('sourceSha256')==record['sourceSha256'] and previous.get('sourceGeographicBoundary')==record['sourceGeographicBoundary']:
        standing=previous.get('visibilityReview',{}).get('standingReview')
        if standing:record['visibilityReview']['standingReview']=standing
        if previous.get('structuralSourceReview'):record['structuralSourceReview']=previous['structuralSourceReview']
(ROOT/'src/circuits/asia/lusail-general-admission.json').write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(f'Lusail Hill: {len(parts)} patches, source {source.area:.1f}m2, excluded {source.area-usable.area:.1f}m2; global affine RMS {record["registration"]["globalAffineRmsMetres"]:.1f}m (not survey accuracy)')
