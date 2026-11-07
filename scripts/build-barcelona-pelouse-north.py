"""Approximate remaining named Pelouse parcels, keeping annual enclosure uncertainty."""
import copy,json,math,sys,xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/barcelona.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(np.array(p)/sc+o).tolist()
poly=lambda b:Polygon([xy(p) for p in b])
r=ET.parse(ROOT/'research/local-polish/barcelona-osm.xml').getroot();nodes={n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])] for n in r.findall('node')}
f=read('src/circuits/facilities/barcelona.json')
ex=[poly(s['boundary']).buffer(1) for z in d['spectatorZones'] for s in z['surfaces']]
ex += [poly(b['boundary']).buffer(1) for b in f['buildings']]
ex += [LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2+1) for l in f['pitLanes']]
ex += [LineString([xy(p) for p in d['trackGeometry']['coordinates']]).buffer(16)]
exclude=unary_union(ex);out=dict(circuitId='barcelona',season=2026,zones=[],beforeZones=[],scope='Remaining physical named Pelouse parcels interpreted as approximate common viewing ground; precise annual access enclosure unverified.')
template=read('src/circuits/europe/barcelona-common-pelouse-2026.json')['zones'][0]
privilege='--privilege' in sys.argv
entries=[('1530387870','pelouse-privilege','Pelouse Privilege')] if privilege else ([('1427286510','pelouse-t8','Pelouse · T8')] if '--t8' in sys.argv else [('1427286511','pelouse-back-straight','Pelouse · T9–T10'),('1427286512','pelouse-north-n','Pelouse · N 北侧')])
for wid,zid,name in entries:
 w=next(w for w in r.findall('way') if w.attrib['id']==wid);g=poly([nodes[n.attrib['ref']] for n in w.findall('nd')]).difference(exclude).buffer(0)
 parts=[g] if g.geom_type=='Polygon' else list(g.geoms);parts=[p for p in parts if p.area>80];assert parts,zid
 surfaces=[]
 for p in parts:
  assert not p.interiors,'Reserved holes must never be filled'
  pts=np.array(p.exterior.coords[:-1]);center=pts.mean(axis=0);_,v=np.linalg.eigh((pts-center).T@(pts-center));axis=v[:,-1];n=np.array([-axis[1],axis[0]])
  a=(pts-center)@axis;b=(pts-center)@n;cut=Polygon([center+axis*x+n*y for x,y in [(a.min()+.5,b.min()-1),(a.max()-.5,b.min()-1),(a.max()-.5,b.max()+1),(a.min()+.5,b.max()+1)]])
  p=p.intersection(cut);assert p.geom_type=='Polygon'
  surfaces.append(dict(surfaceId=f'{zid}-{len(surfaces)+1}',boundary=[ll(a) for a in p.exterior.coords],rowDirection=[float(axis[0]),float(-axis[1])],baseHeight=.04,rise=0,rows=0,eyeHeight=1.65,terrainFollow=True,terrainMeshSpacingMetres=4))
 z=copy.deepcopy(template);z.update(zoneId=zid,name=name,boundary=surfaces[0]['boundary'],surfaces=surfaces)
 for key in ['source','surfaceSource']:z[key].update(url=f'https://www.openstreetmap.org/way/{wid}',notes='Native named Pelouse parcel interpreted as approximate public ground; exclude registered seats/AlonsoLand/other ground/buildings/pits and16m road band. Promoter defines common Pelouse separately fromT1/T2 Privilege. Exact2026 ticket enclosure unverified; source terrain standing1.65m.')
 z['description']='原生Pelouse地块的近似观赛地面，地形及围网可能遮挡。'
 z['admissionNote']='普通Pelouse近似范围，年度现场围界尚未测绘；不含相邻N看台或专属Alonso Land。'
 z['geometryReview']=dict(checkedAt='2026-11-06',issues=[],method='Independent named grass parcel minus registered reserved areas/facilities and actual road band.')
 if privilege:
  z['openingSource'].update(url='https://www.circuitcat.com/en/frequently-asked-questions-membership/',notes='2026 venue map labels Pelouse Privilege at end straight. Promoter membership FAQ confirmsT1/T2 view, season-ticket-holder-only access, ordinary Pelouse excluded.')
  z['admissionNote']='仅限 Pelouse Privilege 年票持有人；普通 Pelouse 票不可进入。边界为源图关联近似范围。'
  z['description']='主直道末端内侧的会员草地，可观察T1、T2；按现有地形站立，局部遮挡保留。'
  for key in ['source','surfaceSource']:
   z[key].update(confidence='low',notes='Named native Pelouse privilege parcel1530387870, consistent with explicit2026 venue map at end straight insideT1/T2. Membership FAQ excludes ordinary Pelouse access. Subtract registered reserved zones/buildings/pits and16m road band; approximate annual fence, source terrain standing1.65m.')
  out['scope']='2026 venue map explicitly labels Pelouse Privilege; named native parcel anchors approximate member-only T1/T2 viewing ground. No ordinary GA entitlement inferred.'
 out['zones'].append(z)
p=ROOT/('src/circuits/europe/barcelona-pelouse-privilege-2026.json' if privilege else 'src/circuits/europe/barcelona-pelouse-t8-2026.json' if '--t8' in sys.argv else 'src/circuits/europe/barcelona-pelouse-north-2026.json');assert not p.exists()
p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print([(z['zoneId'],len(z['surfaces'])) for z in out['zones']])
