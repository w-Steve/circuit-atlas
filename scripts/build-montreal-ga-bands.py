"""Approximate reported GA sectors within source event zones, never entire access zones."""
import copy,json,math
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString,Point,shape
from shapely.ops import unary_union,transform
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/montreal.json');raw=read('research/americas/montreal-pam-public/response-1.json')
o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
ll=lambda p:(np.array(p)/sc+o).tolist()
poly=lambda b:Polygon([xy(p) for p in b])
road=LineString([xy(p) for p in d['trackGeometry']['coordinates']])
f=read('src/circuits/facilities/montreal.json')
excluded=[poly(s['boundary']).buffer(1) for z in d['spectatorZones'] for s in z['surfaces']]
excluded += [poly(b['boundary']).buffer(1) for b in f['buildings']]
excluded += [LineString([xy(p) for p in a['coordinates']]).buffer(a['widthMetres']/2+1) for a in f['pitLanes']]
for a in read('src/circuits/water/montreal.json')['features']:
 excluded.append(Polygon([xy(p) for p in a['rings'][0]],[[xy(p) for p in ring] for ring in a['rings'][1:]]).buffer(1))
access=read('src/circuits/americas/montreal-ga-access-2026.json')
excluded += [poly(a['boundary']) for a in access['excludedAccessAreas']]
# Public source footprints exclude physically occupied services and reserved seats.
tenants={t['uuid']:t for t in raw['tenants']}
for a in raw['navMap']['features']:
 t=tenants.get(a['properties'].get('tenantId'))
 if not t or t['category']['name']=='Zones' or t['name']=='General Admission':continue
 if a['geometry']['type'] not in ['Polygon','MultiPolygon']:continue
 g=transform(lambda x,y,z=None:((np.asarray(x)-o[0])*sc[0],(np.asarray(y)-o[1])*sc[1]),shape(a['geometry']))
 if g.is_valid:excluded.append(g.buffer(1))
exclusion=unary_union(excluded).union(road.buffer(12))
result={'circuitId':'montreal','season':2026,'beforeZones':[],'zones':[],
 'scope':'Two reported viewing sectors represented by approximate road-relative ground bands. Not all GA ticket geography or surveyed boundaries.',
 'annualEvidence':{'organizer':access['evidence'],'sectorReport':'https://www.reddit.com/r/GrandPrixTravel/comments/1to7dgt/thoughts_on_montreal_general_admission/',
 'supplier2026':'https://graandprix-events.com/product/general-admission-sunday-only/',
 'notes':'Organizer archive confirms2026 GA rights. First-person report names green Casino Straight and yellow hairpin approach;2026 supplier also namesT10/T11 andT6. Exact report timestamp remains index-only; no annual footprint certification.'}}
for zid,name,label,corner,start,end in [
 ('ga-hairpin-approach','GA · 发夹弯前','Yellow Zone',9,110,310),
 ('ga-casino-straight','GA · 赌场直道','Green Zone',12,160,310)]:
 loc=next(a for a in raw['locations'] if a.get('displayText')==label)
 feat=next(a for a in raw['navMap']['features'] if a['id']==loc['featureId'])
 zonePoly=poly(feat['geometry']['coordinates'][0])
 c=next(a['coordinate'] for a in d['corners'] if a['number']==corner)
 arc=road.project(Point(xy(c)));front=[];back=[]
 for delta in np.linspace(start,end,25):
  s=arc+delta;a=np.array(road.interpolate(s).coords[0])
  t=np.array(road.interpolate(s+1).coords[0])-np.array(road.interpolate(s-1).coords[0]);t/=np.linalg.norm(t)
  n=np.array([t[1],-t[0]]) # driver right: east before hairpin, west beside Casino Straight
  front.append(a+n*14);back.append(a+n*30)
 g=Polygon(front+list(reversed(back))).intersection(zonePoly).difference(exclusion).buffer(0).simplify(.05,preserve_topology=True)
 parts=[g] if g.geom_type=='Polygon' else list(g.geoms)
 parts=[a for a in parts if a.area>60 and not a.interiors];assert parts,zid
 src={'url':'https://gpcanada.ca/en/event/site-map/','checkedAt':'2026-11-06','method':'estimated','confidence':'low',
  'notes':f'Reported {label} viewing sector; author14–30m road-relative band clipped to official event zone and excluding registered seats/services/buildings/pits/water/Blue area. Source terrain and standing1.65m; not surveyed GA boundary.'}
 surfaces=[]
 for i,p in enumerate(parts):
  b=[ll(a) for a in p.exterior.coords]
  # Trim sub-metre pointed ends in a fixed local axis. Float32 rendering must
  # retain a finite picking section at both ends of the approximate ground.
  pts=np.array(p.exterior.coords[:-1]);center=pts.mean(axis=0)
  values,vectors=np.linalg.eigh((pts-center).T@(pts-center));axis=vectors[:,-1];normal=np.array([-axis[1],axis[0]])
  along=(pts-center)@axis;across=(pts-center)@normal
  cut=Polygon([center+axis*a+normal*n for a,n in [(along.min()+.5,across.min()-1),(along.max()-.5,across.min()-1),(along.max()-.5,across.max()+1),(along.min()+.5,across.max()+1)]])
  p=p.intersection(cut);assert p.geom_type=='Polygon' and not p.interiors
  b=[ll(a) for a in p.exterior.coords]
  surfaces.append(dict(surfaceId=f'{zid}-{i+1}',boundary=b,rowDirection=[float(axis[0]),float(-axis[1])],baseHeight=.04,rise=0,rows=0,eyeHeight=1.65,terrainFollow=True,terrainMeshSpacingMetres=4))
 surfaces.sort(key=lambda s:poly(s['boundary']).area,reverse=True)
 z=dict(zoneId=zid,name=name,kind='grass',availability='available',boundary=surfaces[0]['boundary'],surfaces=surfaces,
  surface=dict(baseHeight=.04,rise=0,eyeHeight=1.65,depth=16),source=src,surfaceSource=copy.deepcopy(src),
  openingSource=dict(url=access['evidence']['url'],checkedAt='2026-11-06',method='published',confidence='high',notes='Annual2026 organizer GA rights, excluding Blue/Senna and VIP; no reserved seating.'),
  description='普通GA近似观赛范围，站立观看；围网、地形及其他观众可能影响视线。',
  geometryReview=dict(checkedAt='2026-11-06',issues=[],method='Source event-zone clipped interpretation; actual road and facilities checked separately.'))
 result['zones'].append(z)
 print(zid,len(surfaces),round(sum(poly(s['boundary']).area for s in surfaces)), 'm2')
p=ROOT/'src/circuits/americas/montreal-ga-bands-2026.json'
assert not p.exists(),'Preserve source review'
p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
