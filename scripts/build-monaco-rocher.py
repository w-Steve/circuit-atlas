"""Independent Rocher candidate; no runtime migration or admission activation."""
from monaco_road_registration import ROOT,read,data,metric,alignment,public,worldRoad,o,factor,np,Polygon,Point,unary_union,hashlib,json
import math
from PIL import Image,ImageDraw

from monaco_public_registration import controls,ref,annotated,pixels,world,tri,inverse,warp,osm,retrieval,tree,nodes,x0,y0,n
source=next(a for a in public['areas'] if a['productId']=='rocher')
roads=unary_union([Polygon(t) for t in metric['triangles']]);surfaces=[];checks=[];shapes=[]
evidence={'url':public['sourceUrl'],'checkedAt':'2026-10-27','method':'estimated','confidence':'low','notes':'Four official2026 source parts; approximate road-arc plus OSM junction nodes and a government-map bend observation. Manual image correspondences need independent verification; no boundary clipping or visibility fitting.'}
for i,part in enumerate(source['sourceParts']):
    outline=np.array(part['pixelBoundary']);poly=Polygon((np.c_[outline,np.ones(len(outline))]@inverse.T)[:,:2])
    for ids in tri.simplices:
        if Polygon(pixels[ids]).intersection(poly).area>1e-9:
            assert np.linalg.det(np.c_[pixels[ids],np.ones(3)])*np.linalg.det(np.c_[world[ids],np.ones(3)])>0,'Interior mapping folds'
    samples=[]
    for a,b in zip(outline[:-1],outline[1:]):samples.extend(np.linspace(a,b,max(2,int(np.linalg.norm(b-a)/2)),endpoint=False))
    mapped=np.array([warp(p) for p in samples]);mapped=np.r_[mapped,mapped[:1]];shape=Polygon(mapped)
    assert shape.is_valid and shape.area>0 and shape.intersection(roads).area<1e-6,'Invalid or road-overlapping Rocher part'
    assert not any(shape.intersection(other).area>1e-6 for other in shapes),'Source parts overlap after mapping'
    overlaps=[]
    for z in data['spectatorZones']:
        for surface in z['surfaces']:
            area=shape.intersection(Polygon((np.array(surface['boundary'])-o)*factor)).area
            if area>1e-6:overlaps.append({'zoneId':z['zoneId'],'availability':z['availability'],'areaMetres2':area})
    assert not any(a['availability']=='available' for a in overlaps),'Rocher intersects an active spectator area'
    facing=worldRoad.interpolate(worldRoad.project(shape.centroid))
    surfaces.append({'surfaceId':f'rocher-{i+1}','boundary':(o+mapped/factor).tolist(),'baseHeight':.04,'rise':0,'rows':0,'eyeHeight':1.65,'terrainFollow':True,'frontReference':(o+np.array(facing.coords)[0]/factor).tolist()})
    checks.append({'part':i+1,'areaMetres2':shape.area,'roadIntersectionMetres2':shape.intersection(roads).area,'otherIntersections':overlaps,'extrapolatedVertices':0,'foldedTriangles':0})
    shapes.append(shape)
streetHits=[]
from shapely.geometry import LineString
for way in tree.findall('way'):
    tags={t.get('k'):t.get('v') for t in way.findall('tag')};name=tags.get('name','')
    if tags.get('highway') not in ['secondary','residential'] or not any(s in name.lower() for s in ['porte neuve','du port','remparts','bellando','saint-martin']):continue
    line=LineString((np.array([nodes[n.get('ref')] for n in way.findall('nd')])-o)*factor)
    lengths=[shape.intersection(line).length for shape in shapes]
    if max(lengths)>.01:streetHits.append({'wayId':way.get('id'),'name':name,'partIntersectionLengthsMetres':lengths,'gradeTags':{k:tags[k] for k in ['tunnel','bridge','layer'] if k in tags}})
zone={'zoneId':'rocher','name':'Rocher · 罗歇山坡','kind':'general-admission','availability':'preparing','boundary':surfaces[0]['boundary'],'surfaces':surfaces,'surface':{'baseHeight':.04,'rise':0,'depth':0,'eyeHeight':1.65},'source':evidence,'boundarySource':evidence,'openingSource':{**evidence,'method':'extracted','confidence':'medium','notes':'Secteur Rocher explicitly listed as standing area in official2026 public map; source pieces are one product.'},'surfaceSource':{**evidence,'notes':'Follow existing IGN regional ground with1.65m standing eye; no invented slope, platform or clearing of natural occlusion.'},'geometryReview':{'checkedAt':'2026-10-27','issues':['Independent control correspondence and residuals not accepted.','Candidate crosses non-racing street centrelines; reconcile street registration and grade before release.','Regional terrain, access paths, retaining walls and default scene not yet verified.'],'method':'Four disconnected source polygons, bounded non-folding piecewise affine registration; no runtime writes.'}}
if any(c['otherIntersections'] for c in checks):zone['geometryReview']['issues'].append('Candidate also overlaps withheld spectator envelopes; reconcile both sources without clipping either model.')
record={'circuitId':'monaco','season':2026,'sourceUrl':public['sourceUrl'],'sourceSha256':public['sourceSha256'],'controlsSha256':hashlib.sha256((ROOT/'src/circuits/europe/monaco-rocher-controls-2026.json').read_bytes()).hexdigest(),'referenceReportSha256':controls['referenceReportSha256'],'geometryFingerprint':hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),'controls':annotated,'checks':checks,'streetReference':{**retrieval,'scope':'Persistent named road-centreline reference, not2026 admission or a surveyed road width/vertical layer. Two-dimensional intersections alone do not establish physical obstruction.'},'streetCentrelineIntersections':streetHits,'zone':zone,'sceneAcceptance':{'accepted':False,'reason':'Street correspondence/grade, withheld-envelope conflicts, independent control checks and terrain/scene acceptance pending.'},'inventoryComplete':False}
(ROOT/'src/circuits/europe/monaco-rocher-world-candidate-2026.json').write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
im=Image.open(ROOT/'artifacts/goal-review/monaco-rocher-topography.png').convert('RGB');draw=ImageDraw.Draw(im)
for shape in shapes:
    geo=o+np.array(shape.exterior.coords)/factor;lon=geo[:,0];lat=np.radians(geo[:,1]);px=(lon+180)/360*n-x0*256;py=(1-np.arcsinh(np.tan(lat))/np.pi)/2*n-y0*256
    draw.line(list(zip(px,py)),fill='#e23737',width=2)
for i,c in enumerate(annotated):
    lon,lat=c['coordinate'];x=(lon+180)/360*n-x0*256;y=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n-y0*256
    draw.ellipse((x-5,y-5,x+5,y+5),fill='#e23737');draw.text((x+8,y),str(i+1),fill='black')
im.save(ROOT/'artifacts/goal-review/monaco-rocher-topography-overlay.png')
print('Rocher candidate: four parts, no extrapolation/folds/racing-road overlap;',len(streetHits),'non-racing street intersections; still unavailable')
