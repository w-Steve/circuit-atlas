"""Bounded official point-query probe; does not produce or replace terrain grids."""
import hashlib,json,math
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'src/circuits/generated/spa.json').read_text('utf8'))
raw=ROOT/'research/elevation/spw-spa';raw.mkdir(parents=True,exist_ok=True)
url='https://geoservices.wallonie.be/arcgis/rest/services/RELIEF/WALLONIE_MNT_2021_2022/MapServer/identify'
proxies={'http':'http://127.0.0.1:7890','https':'http://127.0.0.1:7890'}
samples=[]
for corner in [data['corners'][i] for i in [0,2,9]]:
 lon,lat=corner['coordinate'];values=[];queries=[]
 for size in [2048,4096]:
  params=dict(f='json',geometry=f'{lon},{lat}',geometryType='esriGeometryPoint',sr=4326,tolerance=0,mapExtent=f'{lon-.0006},{lat-.0006},{lon+.0006},{lat+.0006}',imageDisplay=f'{size},{size},96',returnGeometry='true',layers='all:0',returnPixelValues='true')
  r=requests.get(url,params=params,proxies=proxies,timeout=20);r.raise_for_status();reply=r.json()
  assert len(reply.get('results',[]))==1,reply
  result=reply['results'][0];assert result['layerId']==0
  value=float(result['attributes']['Stretch.Pixel Value']);assert math.isfinite(value) and 200<value<900
  point=result['geometry'];assert abs(point['x']-lon)<1e-7 and abs(point['y']-lat)<1e-7
  name=f"identify-t{corner['number']}-{size}.json";content=json.dumps(dict(url=r.url,response=reply),sort_keys=True).encode();(raw/name).write_bytes(content)
  values.append(value);queries.append(dict(displaySize=size,url=r.url,responseSha256=hashlib.sha256(content).hexdigest()))
 assert abs(values[0]-values[1])<.001,'Query scale affects value; do not assume native resolution'
 grid=data['elevation']['grid'];west,south,east,north=grid['bounds'];n=grid['size']
 x=(lon-west)/(east-west)*(n-1);y=(lat-south)/(north-south)*(n-1)
 assert 0<=x<=n-1 and 0<=y<=n-1
 i=min(n-2,int(x));j=min(n-2,int(y));u=x-i;v=y-j
 h=lambda a,b:grid['heights'][b*n+a]
 old=(h(i,j)*(1-u)+h(i+1,j)*u)*(1-v)+(h(i,j+1)*(1-u)+h(i+1,j+1)*u)*v
 samples.append(dict(cornerNumber=corner['number'],coordinate=[lon,lat],serviceValue=values[0],field='Stretch.Pixel Value',scaleDifference=abs(values[0]-values[1]),queries=queries,existingGridAbsoluteInterpolated=old,serviceMinusExistingMetres=values[0]-old))
path=ROOT/'src/circuits/season-review/spa-terrain-source-review.json';review=json.loads(path.read_text('utf8'))
review['pointQueryEvidence']={**review.get('pointQueryEvidence',{}),**dict(checkedAt='2026-10-28',endpoint=url,samples=samples,scope='Three diagnostic service samples, stable across two imageDisplay sizes. Not a native raster, spatial-accuracy certification or proof that the Stretch field is unprocessed DTM.',nativePixelSemanticsVerified=False,runtimeApplied=False)}
review['downloadFindings']['wcsProbe']='WCSServer GetCapabilities returned HTTP400; no bounded WCS extraction established.'
review['downloadFindings']['nextAction']='Validate the official identify Stretch.Pixel Value semantics and sampling resolution against native numeric data/documentation before using it for a terrain candidate; otherwise seek official bounded download.'
review['oneMetreDataset']=dict(catalogue='https://geoportail.wallonie.be/catalogue/fe13bc84-e371-46ca-9632-8ad4139f1ee5.html',note='Official catalogue describes a separately produced1m dataset, not a downsample of0.5m. Not acquired.')
path.write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n','utf8')
print('Spa official diagnostic samples:',[(s['cornerNumber'],s['serviceValue']) for s in samples],'; no terrain grid or runtime changes.')
