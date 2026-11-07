"""Interpret source grass atT5–T8 separately from T1/T2 Privilege and N AlonsoLand."""
import copy,json,math
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,box
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
c=read('src/circuits/europe/barcelona-pelouse-remainder-candidate-2026.json')
o=read('src/circuits/generated/barcelona.json')['trackGeometry']['coordinates'][0];sc=np.array([111320*math.cos(math.radians(o[1])),111320]);origin=np.array(o[:2])
xy=lambda p:(np.array(p)[:2]-origin)*sc
ll=lambda p:(np.array(p)/sc+origin).tolist()
g=Polygon([xy(p) for p in c['parts'][0]['boundary']])
# Explicit approximate northern cutoff before N/AlonsoLand; no extension into
# the private T1/T2 zone or beyond the independently reviewed public sector.
g=g.intersection(box(-1e5,-1e5,1e5,xy([o[0],41.56815])[1]))
parts=[g] if g.geom_type=='Polygon' else list(g.geoms);surfaces=[]
for p in parts:
 if p.area<100:continue
 pts=np.array(p.exterior.coords[:-1]);center=pts.mean(axis=0);_,v=np.linalg.eigh((pts-center).T@(pts-center));axis=v[:,-1];n=np.array([-axis[1],axis[0]])
 a=(pts-center)@axis;b=(pts-center)@n
 cut=Polygon([center+axis*x+n*y for x,y in [(a.min()+.5,b.min()-1),(a.max()-.5,b.min()-1),(a.max()-.5,b.max()+1),(a.min()+.5,b.max()+1)]])
 p=p.intersection(cut);assert p.geom_type=='Polygon' and not p.interiors
 surfaces.append(dict(surfaceId=f'common-pelouse-{len(surfaces)+1}',boundary=[ll(a) for a in p.exterior.coords],rowDirection=[float(axis[0]),float(-axis[1])],baseHeight=.04,rise=0,rows=0,eyeHeight=1.65,terrainFollow=True,terrainMeshSpacingMetres=4))
assert surfaces
z=copy.deepcopy(read('src/circuits/europe/barcelona-jove-2026.json')['zones'][0])
z.update(zoneId='pelouse-t5-t8',name='Pelouse · T5–T8',boundary=surfaces[0]['boundary'],surfaces=surfaces,
 description='T5–T8普通草地近似范围，站立观看；坡面及围网可能影响视线。',admissionNote='普通Pelouse近似范围，不含Privilege、Jove、Alonso Land专属区及看台；实际围界以当年门票要求为准。')
src=dict(url='https://www.openstreetmap.org/way/1427286513',checkedAt='2026-11-06',method='estimated',confidence='low',notes='Native Pelouse remainder clipped toT5–T8 before N/AlonsoLand, excluding existing areas/registered facilities and16m road band. Official membership defines common Pelouse; FAQ places Privilege atT1/T2, not here. Author approximate annual enclosure, terrain standing1.65m; not surveyed ticket boundaries.')
z.update(source=src,surfaceSource=copy.deepcopy(src),openingSource=dict(url='https://www.circuitcat.com/en/membership-modalities/',checkedAt='2026-11-06',method='published',confidence='medium',notes='Promoter2026 membership defines common Pelouse shared with public; Privilege excluded. Physical extent remains estimated.'),geometryReview=dict(checkedAt='2026-11-06',issues=[],method='Explicit source parcel subset, separate from privateT1/T2 and branded N-adjacent ground.'))
out=dict(circuitId='barcelona',season=2026,zones=[z],beforeZones=[],sourceReview='src/circuits/europe/barcelona-pelouse-remainder-candidate-2026.json',privilegeLocationEvidence=dict(url='https://www.circuitcat.com/es/preguntas-frecuentes-abonados/',fact='Promoter FAQ places restricted Privilege at end of straight with views ofT1/T2; does not provide a ticket polygon.'))
p=ROOT/'src/circuits/europe/barcelona-common-pelouse-2026.json';assert not p.exists()
p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
