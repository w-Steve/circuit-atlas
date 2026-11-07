"""Acquire/replay a sourced IGN RGE ALTI candidate; never replaces live terrain.

--offline validates cached query/response pairs without making network requests.
The10m sampling window covers the circuit and Rocher. Native1m product spacing
does not imply1m vertical accuracy or verified local bridge/platform elevations.
"""
import hashlib,json,math,sys,time
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'research/season-review/monaco2026/rge-grid';CACHE.mkdir(exist_ok=True)
URL='https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json'
RESOURCE='ign_rge_alti_par_territoires';BOUNDS=[7.4165,43.729,7.433,43.744];SIZE=169;BATCH=256
west,south,east,north=BOUNDS
coordinates=[(round(west+i*(east-west)/(SIZE-1),7),round(south+j*(north-south)/(SIZE-1),7)) for j in range(SIZE) for i in range(SIZE)]
session=requests.Session();session.proxies.update({'http':'http://127.0.0.1:7890','https':'http://127.0.0.1:7890'})
catalogue=CACHE.parent/'ign-rge-catalogue.json'
if not catalogue.exists():
 if '--offline' in sys.argv:raise FileNotFoundError(catalogue)
 response=session.get('https://www.data.gouv.fr/api/1/datasets/rge-alti-r/',timeout=40);response.raise_for_status();catalogue.write_bytes(response.content)
licensing=json.loads(catalogue.read_text('utf8'))
if licensing.get('id')!='61489f5ae64c7f138f1b2e15' or licensing.get('license')!='lov2':raise ValueError('RGE catalogue identity/license needs review')
heights=[];classes=[];palette=[];manifest=[]
for start in range(0,len(coordinates),BATCH):
 points=coordinates[start:start+BATCH]
 query=dict(lon='|'.join(f'{p[0]:.7f}' for p in points),lat='|'.join(f'{p[1]:.7f}' for p in points),resource=RESOURCE,zonly='false',measures='true')
 queryBytes=json.dumps(query,sort_keys=True,separators=(',',':')).encode();digest=hashlib.sha256(queryBytes).hexdigest()
 prefix=CACHE/f'{start//BATCH:03}';requestPath=prefix.with_suffix('.request.json');responsePath=prefix.with_suffix('.response.json')
 if responsePath.exists():
  if not requestPath.exists() or requestPath.read_bytes()!=queryBytes:raise ValueError('Cached query mismatch; retain old evidence and review the frame')
 else:
  if '--offline' in sys.argv:raise FileNotFoundError(responsePath)
  requestPath.write_bytes(queryBytes)
  response=session.get(URL,params=query,timeout=40);response.raise_for_status()
  payload=response.json()
  if 'error' in payload or len(payload.get('elevations',[]))!=len(points):raise ValueError('Incomplete IGN response')
  responsePath.write_bytes(response.content)
  time.sleep(.35)
 raw=responsePath.read_bytes();rows=json.loads(raw)['elevations']
 if len(rows)!=len(points):raise ValueError('Wrong cached point count')
 for p,row in zip(points,rows):
  if abs(row['lon']-p[0])>5e-8 or abs(row['lat']-p[1])>5e-8:raise ValueError('IGN point order/coordinate mismatch')
  z=row.get('z');valid=isinstance(z,(int,float)) and math.isfinite(z) and -500<z<9000
  heights.append(float(z) if valid else None)
  native=[m for m in row.get('measures',[]) if m.get('title')=='RGE Alti 1m : France métropolitaine + Corse' and isinstance(m.get('z'),(int,float)) and m['z']>-10000]
  if len(native)>1:raise ValueError('Ambiguous territorial measurement')
  if native and valid and abs(native[0]['z']-z)>.001:raise ValueError('Aggregate elevation differs from the retained territorial source')
  category=native[0].get('source_name','Unknown acquisition') if native and valid else 'No elevation'
  if category not in palette:palette.append(category)
  classes.append(palette.index(category))
 manifest.append(dict(start=start,count=len(points),querySha256=digest,responseSha256=hashlib.sha256(raw).hexdigest()))
 if start//BATCH%8==0:print(f'IGN points {len(heights)}/{len(coordinates)}',flush=True)
valid=[v for v in heights if v is not None]
record=dict(circuitId='monaco',checkedAt='2026-10-26',producer='IGN – RGE ALTI',license='Licence Ouverte / Open Licence2.0',licenseId='lov2',licenseEvidence='https://www.data.gouv.fr/datasets/rge-alti-r',
 licenseMetadataSha256=hashlib.sha256(catalogue.read_bytes()).hexdigest(),
 sourceUrl=URL,resource=RESOURCE,bounds=BOUNDS,size=SIZE,rowOrder='south to north; columns west to east',nativeProductSpacingMetres=1,
 samplingMetres=dict(x=(east-west)*111320*math.cos(math.radians((north+south)/2))/(SIZE-1),y=(north-south)*111320/(SIZE-1)),
 heights=heights,acquisitionPalette=palette,acquisitionClasses=classes,requests=manifest,
 validCount=len(valid),missingCount=len(heights)-len(valid),rangeMetres=[min(valid),max(valid)] if valid else None,
 applicationReady=False,limitation='Candidate only. Acquisition density/date/vertical accuracy vary; unknown-source numeric values are not certified LiDAR. NoData stays null. No bridge, road/platform or observer fitting, fallback filling, smoothing or height exaggeration.')
OUT=ROOT/'src/circuits/europe/monaco-rge-alti-candidate.json';OUT.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(f'IGN candidate: {len(valid)} valid, {record["missingCount"]} missing, {len(palette)} acquisition classes; live terrain unchanged',flush=True)
