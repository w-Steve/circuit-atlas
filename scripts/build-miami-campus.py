"""Source-located approximate Campus Pass platforms, never blanket campus access."""
import copy,json,math,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString,Point
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/miami.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(np.array(p)/sc+o).tolist()
poly=lambda b:Polygon([xy(p) for p in b])
road=LineString([xy(p) for p in d['trackGeometry']['coordinates']]);f=read('src/circuits/facilities/miami.json')
obs=[poly(s['boundary']) for z in d['spectatorZones'] for s in z['surfaces']]+[poly(b['boundary']) for b in f['buildings']]+[LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2) for l in f['pitLanes']]+[road.buffer(d['trackGeometry']['widthMetres']/2+.5)]
template=read('src/circuits/americas/las-vegas-flamingo-ga-2026.json')['zones'][0]
out=dict(circuitId='miami',season=2026,zones=[],beforeZones=[],scope='Four public outdoor viewing-platform locations and two stadium helix views from organizer-linked public Concept3D map1951/category60317. Point identities are published, local deck envelopes/heights estimated. Current map is not a frozen2026 installation survey.')
entries=[(723281,'campus-t8','Campus Pass · T8',20,6,1.2),(723287,'campus-east','Campus Pass · East Campus',24,6,1.2),(723288,'campus-beach','Campus Pass · Beach',24,6,1.2),(1032304,'campus-marina','Campus Pass · Marina',18,5,1.2),(609835,'campus-helix-nw','Campus Pass · Helix 西北',26,6,28),(609839,'campus-helix-se','Campus Pass · Helix 东南',26,6,28)]
for ident,zid,name,length,depth,height in entries:
 p=read(f'research/season-review/miami-2026/ga-location-{ident}.json');center=xy([p['lng'],p['lat']]);s=road.project(Point(center));front=np.array(road.interpolate(s).coords[0]);t=np.array(road.interpolate(s+1).coords[0])-np.array(road.interpolate(s-1).coords[0]);t/=np.linalg.norm(t);toward=front-center;toward/=np.linalg.norm(toward)
 if 'helix' in zid:
  # A selectable front-rim subset of the published ~23–24m radius helix.
  # Never fill its hollow core or reinterpret the ramp as grass at grade.
  center=center+toward*19;t=np.array([-toward[1],toward[0]])
 else:
  # Keep the published marker; do not silently translate it for clearance.
  toward=np.array([-t[1],t[0]])*np.sign(t[0]*(front-center)[1]-t[1]*(front-center)[0])
 boundary=[ll(center+t*x+toward*y) for x,y in [(-length/2,-depth/2),(length/2,-depth/2),(length/2,depth/2),(-length/2,depth/2),(-length/2,-depth/2)]]
 q=poly(boundary);conflicts=[q.intersection(b).area for b in obs]
 assert max(conflicts,default=0)<.1,(zid,max(conflicts))
 z=copy.deepcopy(template);z.update(zoneId=zid,name=name,boundary=boundary,surfaces=[dict(surfaceId=zid+'-1',boundary=boundary,baseHeight=height,rise=0,rows=0,eyeHeight=1.65,frontReference=ll(front))],surface=dict(baseHeight=height,rise=0,eyeHeight=1.65,depth=depth),supportToTerrain=True)
 url=f'https://map.concept3d.com/?id=1951#!m/{ident}'
 for key in ['source','surfaceSource']:z[key]=dict(url=url,checkedAt='2026-11-06',method='estimated',confidence='low',notes=f'Organizer-linked public GA category60317 location{ident}: '+p['name']+f'. Published point retained; author {length}x{depth}m deck subset, floor{height}m estimated. Helix front rim interpreted from published circle where applicable. Zero API altitude is a marker default, not surveyed floor. Standing1.65m. Map snapshot has no2026 version certificate; not a full enclosure.')
 z['openingSource']=dict(url='https://f1miamigp.com/news/press-release/neighborhood-inspired-campus-2026/',checkedAt='2026-11-06',method='published',confidence='medium',notes='Dated organizerApril7,2026 release confirms Campus Pass and general campus access excluding premium hospitality; explicitly names Marina viewing deck. Public map GA locations supply geographic association; exact2026 individual installation continuity unverified.')
 z['admissionNote']='Campus Pass近似站立平台；不含编号座席及贵宾区。平台范围、高度与2026逐点连续性未测绘确认。'
 z['description']='体育场Helix高处站立观赛，平台高度为估计。' if 'helix' in zid else '独立站立平台，近似范围，眼高1.65米。'
 z['geometryReview']=dict(checkedAt='2026-11-06',issues=[],method='Published GA location, explicitly estimated deck subset; no relocation for clearance. Screened against road, registered stands and facilities.')
 out['zones'].append(z)
out['sourceSnapshotSha256']=hashlib.sha256((ROOT/'research/season-review/miami-2026/ga-60317.json').read_bytes()).hexdigest()
p=ROOT/'src/circuits/americas/miami-campus-2026.json';assert not p.exists();p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n','utf8')
