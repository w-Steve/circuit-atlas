"""Explicit approximate T6-family GA ground behind the source family grandstand."""
import copy,json,math
from pathlib import Path
from shapely.geometry import Polygon,LineString
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/montreal.json');o=[-73.5282,45.50355];sx=111320*math.cos(math.radians(o[1]))
ll=lambda x,y:[o[0]+x/sx,o[1]+y/111320]
xy=lambda p:((p[0]-o[0])*sx,(p[1]-o[1])*111320)
b=[ll(x,y) for x,y in [(-20,-5),(20,-5),(20,5),(-20,5),(-20,-5)]];p=Polygon([xy(a) for a in b])
f=read('src/circuits/facilities/montreal.json')
obstacles=[Polygon([xy(a) for a in s['boundary']]) for z in d['spectatorZones'] for s in z['surfaces']]
obstacles += [Polygon([xy(a) for a in a['boundary']]) for a in f['buildings']]
obstacles += [LineString([xy(a) for a in l['coordinates']]).buffer(l['widthMetres']/2) for l in f['pitLanes']]
obstacles += [Polygon([xy(a) for a in w['rings'][0]],[[xy(a) for a in ring] for ring in w['rings'][1:]]) for w in read('src/circuits/water/montreal.json')['features']]
assert all(p.intersection(a).area<.1 for a in obstacles),'Review source location; never move it just to clear obstacles'
z=copy.deepcopy(read('src/circuits/americas/montreal-ga-bands-2026.json')['zones'][0])
z.update(zoneId='ga-t6-family',name='GA · T6 Family 区域',boundary=b,surfaces=[dict(surfaceId='ga-t6-family-1',boundary=b,rowDirection=[1,0],baseHeight=.04,rise=0,rows=0,eyeHeight=1.65,terrainFollow=True,terrainMeshSpacingMetres=4)])
z['surface'].update(depth=10)
z['source']['notes']='T6 inside/family sector named by2026 GA supplier; supporting schematic depicts GA behind family stand33. Author40x10m subset north of registered33 footprint; not exact event ticket boundary. Terrain-standing1.65m; seat bank may block cars and is not removed.'
z['surfaceSource']=copy.deepcopy(z['source'])
z['description']='T6 Family区后侧近似GA地面，邻近看台可能遮挡赛车。'
z['admissionNote']='普通GA近似观赛范围，不含Family编号座席；当年实际围界未测绘。'
z['geometryReview']=dict(checkedAt='2026-11-06',issues=[],method='Explicit estimated T6-family ground subset, registered seats/buildings/pits/water excluded. Natural occlusion retained.')
r=dict(circuitId='montreal',season=2026,zones=[z],beforeZones=[],sourceEvidence=read('src/circuits/americas/montreal-ga-bands-2026.json')['annualEvidence'],accuracy='Approximate location and extent; source year/rights separate from geometry precision.')
p=ROOT/'src/circuits/americas/montreal-t6-ground-2026.json';assert not p.exists()
p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
