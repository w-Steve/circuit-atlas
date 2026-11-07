"""Build a non-published Silverstone EA DTM candidate from cached official data.
Requires numpy/rasterio/pyproj; never changes generated runtime packages.
Only numeric1m pixels actually supporting output samples are retained, not the
complete15MB GeoTIFF or unused native pixels. --validate is offline stdlib-only.
"""
import argparse,base64,copy,hashlib,json,math,struct,sys,zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'research/elevation/uk-ea-silverstone'
OUT=ROOT/'src/circuits/elevation-source/candidates/silverstone-ea-dtm.json'
read=lambda p:json.loads(p.read_text('utf8'))
def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def elevation_replacement(record):
 result=copy.deepcopy(record['previousElevation'])
 result.update(status='partial',samples=[],grid=record['grid'],source=record['runtimeSource'],notes=record['runtimeNotes'],attribution=record['attribution'])
 return result

def configure_facilities(current,record):
 desired=copy.deepcopy(record['previousFacilities'])
 for lane in desired['pitLanes']:lane['terrainMeshSpacingMetres']=2
 for building in desired['buildings']:building['foundationToTerrain']=True
 if current not in [record['previousFacilities'],desired]:raise ValueError('Preserve independent pit/building edits')
 return desired

def retain_applied_elevation(cid,elevation):
 if cid!='silverstone' or not OUT.exists():return False
 record=read(OUT)
 if not record.get('runtimeApplied') or not record['sceneAcceptance']['accepted']:return False
 replacement=elevation_replacement(record)
 if elevation not in [record['previousElevation'],replacement]:raise ValueError('Preserve independent EA elevation edits before coarse regeneration')
 return elevation==replacement

def apply(ids=None,optional=False):
 if ids and 'silverstone' not in ids:return
 record=read(OUT)
 if not record['sceneAcceptance'].get('accepted'):
  if optional:return
  raise ValueError('EA terrain requires explicit scene acceptance')
 validate(record)
 if digest(record['grid'])!=record['sceneAcceptance']['numericGridSha256']:raise ValueError('Accepted grid changed')
 path=ROOT/'src/circuits/generated/silverstone.json';data=read(path);replacement=elevation_replacement(record)
 if data['elevation'] not in [record['previousElevation'],replacement]:raise ValueError('Preserve independent elevation edits')
 facilities_path=ROOT/'src/circuits/facilities/silverstone.json';facilities=configure_facilities(read(facilities_path),record)
 # The accepted Village A footprint was independently exercised with this grid.
 stand_path=ROOT/'src/circuits/europe/silverstone-village-a-2026.json';stand=read(stand_path);check=record['sceneAcceptance']['villageARevalidation']
 if digest(stand['zone'])!=check['zoneSha256'] or stand['geometryFingerprint'] not in [check['previousFingerprint'],check['newFingerprint']]:raise ValueError('Village A source changed; revalidate')
 data['elevation']=replacement
 if digest({k:data[k] for k in ['trackGeometry','corners','elevation']})!=check['newFingerprint']:raise ValueError('Track context changed; revalidate')
 if not any(s['url']==record['source'] for s in data['dataSources']):data['dataSources'].append(record['runtimeSource'])
 stand['geometryFingerprint']=check['newFingerprint'];stand['terrainRevalidation']=check
 coverage_path=ROOT/'src/circuits/elevation-source/coverage.json';coverage=read(coverage_path);row=next(r for r in coverage if r['circuitId']=='silverstone')
 if 'gedtmBaseline' not in row:row['gedtmBaseline']=copy.deepcopy(row)
 row.update(dataset=record['dataset'],sampleCount=len(record['grid']['heights']),minMetres=min(record['grid']['heights']),maxMetres=max(record['grid']['heights']),responseSha256=[record['wcs']['sha256']],runtimeApplied=True,source=record['source'],checkedAt=record['checkedAt'],verticalDatum=record['verticalDatum'],surveyYear=record['survey']['year'])
 record['runtimeApplied']=True
 # All source/edit checks finish before the first write.
 for target,value in [(path,data),(facilities_path,facilities),(stand_path,stand),(coverage_path,coverage),(OUT,record)]:target.write_text((json.dumps(value,ensure_ascii=False,indent=2) if target==coverage_path else json.dumps(value,ensure_ascii=False,separators=(',',':')))+'\n','utf8')
 print('Silverstone EA terrain and vertically draped facilities applied; independent edits guarded.')
def pack(raw):return {'zlibBase64':base64.b64encode(zlib.compress(raw,9)).decode(),'sha256':hashlib.sha256(raw).hexdigest(),'byteLength':len(raw)}
def unpack(record):
 raw=zlib.decompress(base64.b64decode(record['zlibBase64'],validate=True))
 if len(raw)!=record['byteLength'] or hashlib.sha256(raw).hexdigest()!=record['sha256']:raise ValueError('Numeric source support changed')
 return raw
def validate(record):
 grid=record['grid'];support=record['nativeSupport'];count=grid['size']**2
 if not isinstance(grid['size'],int) or grid['size']<2:raise ValueError('Invalid grid size')
 bounds=grid['bounds']
 if len(bounds)!=4 or not all(math.isfinite(n) for n in bounds) or not bounds[0]<bounds[2] or not bounds[1]<bounds[3]:raise ValueError('Invalid geographic bounds')
 if count!=support['sampleCount'] or len(grid['heights'])!=count:raise ValueError('Incomplete output grid')
 values=unpack(support['valuesFloat32']);fractions=unpack(support['fractionsFloat64']);indices=unpack(support['pixelIndicesInt32'])
 if [len(values),len(fractions),len(indices)]!=[count*16,count*16,count*8]:raise ValueError('Invalid support layout')
 width,height=support['rasterSize'];maxError=0
 if width<2 or height<2:raise ValueError('Invalid native raster size')
 for k,((a,b,c,d),(u,v),(col,row)) in enumerate(zip(struct.iter_unpack('<ffff',values),struct.iter_unpack('<dd',fractions),struct.iter_unpack('<ii',indices))):
  if not all(math.isfinite(n) for n in [a,b,c,d,u,v]) or not 0<=u<1 or not 0<=v<1 or not 0<=col<width-1 or not 0<=row<height-1:raise ValueError('Invalid native support or extrapolation')
  if any(n < support['nativeMinMetres'] or n > support['nativeMaxMetres'] for n in [a,b,c,d]):raise ValueError('Support outside verified native range (possible nodata)')
  expected=(a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v
  actual=grid['heights'][k]
  if not math.isfinite(actual):raise ValueError('Invalid output height')
  maxError=max(maxError,abs(expected-actual))
 if maxError>.000501:raise ValueError('Output does not replay from native metre values')
 return maxError
def build():
 if OUT.exists() and read(OUT).get('runtimeApplied'):raise ValueError('Do not rebuild an applied source in place; prepare a new candidate')
 # The task's optional terrain packages are local; do not change global Python.
 extra=ROOT/'.tools/python-terrain'
 if extra.exists():sys.path.insert(0,str(extra))
 import numpy as np
 import rasterio
 from pyproj import datadir
 from pyproj.transformer import TransformerGroup
 metadata=read(RAW/'silverstone-dtm-native.meta.json');raster=RAW/'silverstone-dtm-native.tif'
 if metadata['status']!=200 or hashlib.sha256(raster.read_bytes()).hexdigest()!=metadata['sha256']:raise ValueError('Unverified WCS raster')
 transformMeta=read(RAW/'ostn15.meta.json');transformFile=RAW/'uk_os_OSTN15_NTv2_OSGBtoETRS.tif'
 if transformMeta['status']!=200 or hashlib.sha256(transformFile.read_bytes()).hexdigest()!=transformMeta['sha256']:raise ValueError('Unverified OSTN15 grid')
 datadir.append_data_dir(str(RAW));group=TransformerGroup(4326,27700,always_xy=True)
 if not group.best_available:raise ValueError('Do not silently fall back from OSTN15')
 transform=group.transformers[0];data=read(ROOT/'src/circuits/generated/silverstone.json');old=data['elevation']['grid'];bounds=old['bounds'];size=257
 lon,lat=np.meshgrid(np.linspace(bounds[0],bounds[2],size),np.linspace(bounds[1],bounds[3],size));east,north=transform.transform(lon,lat)
 with rasterio.open(raster) as ds:
  if ds.crs.to_epsg()!=27700 or ds.res!=(1.,1.) or ds.dtypes!=('float32',):raise ValueError('Unexpected native units/CRS/spacing')
  native=ds.read(1);valid=np.isfinite(native)&(native!=ds.nodata)
  if not valid.all():raise ValueError('Missing native heights must not be filled with zero')
  x=(east-ds.bounds.left)/ds.res[0]-.5;y=(ds.bounds.top-north)/ds.res[1]-.5
  col=np.floor(x).astype('int32');row=np.floor(y).astype('int32');u=x-col;v=y-row
  if col.min()<0 or row.min()<0 or col.max()>=ds.width-1 or row.max()>=ds.height-1:raise ValueError('Source does not fully cover sampling support')
  supportValues=np.stack([native[row,col],native[row,col+1],native[row+1,col],native[row+1,col+1]],axis=-1)
  a,b,c,d=[supportValues[:,:,i].astype('float64') for i in range(4)];heights=np.round((a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v,3)
  nativeInfo={'crs':'EPSG:27700','nativeResolutionMetres':1,'rasterSize':[ds.width,ds.height],'rasterBounds':list(ds.bounds),'validPixelCount':int(valid.sum()),'nativeMinMetres':float(native.min()),'nativeMaxMetres':float(native.max())}
 # Compare absolute heights only as a consistency check, not datum conversion.
 axis=np.linspace(0,old['size']-1,size);xx,yy=np.meshgrid(axis,axis);ii=np.minimum(np.floor(xx).astype(int),old['size']-2);jj=np.minimum(np.floor(yy).astype(int),old['size']-2);uu=xx-ii;vv=yy-jj;g=np.array(old['heights']).reshape(old['size'],old['size'])
 previous=(g[jj,ii]*(1-uu)+g[jj,ii+1]*uu)*(1-vv)+(g[jj+1,ii]*(1-uu)+g[jj+1,ii+1]*uu)*vv;delta=heights-previous
 indexMeta=read(RAW/'survey-index-silverstone.meta.json');indexRaw=(RAW/'survey-index-silverstone.json').read_bytes()
 if indexMeta['status']!=200 or hashlib.sha256(indexRaw).hexdigest()!=indexMeta['sha256']:raise ValueError('Unverified survey metadata')
 survey=read(RAW/'survey-index-silverstone.json');assert survey['numberMatched']==survey['numberReturned']==1
 facts=survey['features'][0]['properties'];assert facts['year']=='2019' and facts['resolution']==1
 record={'circuitId':'silverstone','dataset':'EA-LIDAR-COMPOSITE-DTM-1m','compositeYear':2022,'checkedAt':'2026-10-28','source':'https://environment.data.gov.uk/dataset/13787b9a-26a4-4775-8523-806d13af58fc','license':'Open Government Licence v3.0','attribution':'© Environment Agency copyright and/or database right2022. All rights reserved.','verticalDatum':'Ordnance Datum Newlyn','units':'metres','survey':facts,'surveyIndex':indexMeta,'wcs':metadata,'horizontalTransform':{**transformMeta,'operation':transform.description,'bestAvailable':True,'reportedAccuracyMetres':transform.accuracy},
 'nativeSupport':{**nativeInfo,'layout':'h00,h10,h01,h11 in top-down native raster; grid rows run south to north','sampleCount':size**2,'valuesFloat32':pack(supportValues.astype('<f4').tobytes()),'fractionsFloat64':pack(np.stack([u,v],axis=-1).astype('<f8').tobytes()),'pixelIndicesInt32':pack(np.stack([col,row],axis=-1).astype('<i4').tobytes())},
 'grid':{'bounds':bounds,'size':size,'heights':heights.ravel().tolist(),'referenceAltitude':old['referenceAltitude'],'resolutionMetres':1},
 'outputSpacingMetresAtCentre':{'eastWest':float(east[size//2,size//2+1]-east[size//2,size//2]),'northSouth':float(north[size//2+1,size//2]-north[size//2,size//2])},
 'comparison':{'baselineDataset':data['elevation']['source']['url'],'baselineVerticalDatum':'EGM2008','absoluteDeltaMinMetres':float(delta.min()),'absoluteDeltaMaxMetres':float(delta.max()),'absoluteDeltaMedianMetres':float(np.median(delta)),'absoluteDeltaP95Metres':float(np.percentile(np.abs(delta),95)),'limits':'Contains datum, epoch and resolution differences, not an error calibration. No median offset, height scaling or terrain exaggeration applied.'},
 'sceneAcceptance':{'accepted':False},'runtimeApplied':False,'limits':'Native2019 bare-earth data from2022 composite, not2026 track/temporary seating survey. Runtime candidate257-grid has roughly5–9m spacing, not1m render detail. Reference altitude retained as an arbitrary visualization origin; no EGM2008/ODN vertical conversion claimed.'}
 validate(record);OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print(json.dumps({'surveyYear':facts['year'],'validNativePixels':nativeInfo['validPixelCount'],'candidateSamples':size**2,'supportFileBytes':OUT.stat().st_size,'comparison':record['comparison']},ensure_ascii=False))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--build',action='store_true');parser.add_argument('--validate',action='store_true');parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 if args.build:build()
 if args.validate:print(f'Offline native-support replay max rounding error:{validate(read(OUT)):.7f}m; runtime not modified.')
 if args.apply:apply()
