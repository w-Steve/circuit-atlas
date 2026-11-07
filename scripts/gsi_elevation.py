"""Suzuka GSI elevation extraction from retained official numeric PNG tiles.
--extract: interpret downloaded tiles and keep numeric evidence, not map art.
--apply: use shared regional application path; --check-source: verify tile hashes.
Raw downloads live in research/season-review/suzuka-gsi and are not app assets.
"""
import base64,hashlib,json,math,zlib
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'research/season-review/suzuka-gsi'
DEST=ROOT/'src/circuits/elevation-source/regional-grids/suzuka-gsi.json'
SOURCE='https://maps.gsi.go.jp/development/ichiran.html'

def decode(path):
    rgb=np.asarray(Image.open(path).convert('RGB'),dtype=np.int32)
    value=rgb[:,:,0]*65536+rgb[:,:,1]*256+rgb[:,:,2]
    return np.where(value==8388608,np.nan,np.where(value<8388608,value,value-16777216)/100.)

def pixels(lon,lat,zoom):
    scale=2**zoom*256
    return (np.asarray(lon)+180)/360*scale,(1-np.arcsinh(np.tan(np.deg2rad(lat)))/np.pi)/2*scale

def mosaic(layer,zoom):
    files=list(RAW.glob(f'{layer}-{zoom}-*.png'))
    coords=[tuple(map(int,f.stem.split('-')[2:])) for f in files]
    xmin,ymin=np.min(coords,axis=0);xmax,ymax=np.max(coords,axis=0)
    result=np.full(((ymax-ymin+1)*256,(xmax-xmin+1)*256),np.nan);records=[]
    for f,(x,y) in zip(files,coords):
        result[(y-ymin)*256:(y-ymin+1)*256,(x-xmin)*256:(x-xmin+1)*256]=decode(f)
        records.append({'layer':layer,'zoom':zoom,'x':x,'y':y,'url':f'https://cyberjapandata.gsi.go.jp/xyz/{layer}/{zoom}/{x}/{y}.png','sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
    return result,int(xmin)*256,int(ymin)*256,sorted(records,key=lambda r:(r['x'],r['y']))

def rebuild(record,path=DEST):
    n=record['nativeWindow'];g=record['grid'];w,s,e,north=g['bounds'];size=g['size']
    payload=zlib.decompress(base64.b64decode(n['float32ZlibBase64']))
    if hashlib.sha256(payload).hexdigest()!=n['float32Sha256']:raise ValueError('Retained source window changed')
    native=np.frombuffer(payload,dtype='<f4').reshape(n['size'][1],n['size'][0])
    lon,lat=np.meshgrid(np.linspace(w,e,size),np.linspace(s,north,size));x,y=pixels(lon,lat,n['zoom']);px=x-.5-n['pixelOrigin'][0];py=y-.5-n['pixelOrigin'][1]
    if px.min()<0 or py.min()<0 or px.max()>=native.shape[1]-1 or py.max()>=native.shape[0]-1:raise ValueError('Insufficient source border: no extrapolation')
    v=map_coordinates(native,[py,px],order=1,mode='constant',cval=np.nan,prefilter=False)
    if not np.isfinite(v).all():raise ValueError('No missing-cell fabrication')
    g['heights']=[round(float(value),3) for value in v.ravel()];g['referenceAltitude']=min(g['heights'])
    mask=np.unpackbits(np.frombuffer(zlib.decompress(base64.b64decode(n['fallbackMaskZlibBase64'])),dtype='uint8'))[:native.size].reshape(native.shape)
    contribution=map_coordinates(mask.astype(float),[py,px],order=1,mode='constant',cval=np.nan,prefilter=False)
    record['outputFallbackContributedSamples']=int(np.sum(contribution>0))
    path.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')

def extract():
    data=json.loads((ROOT/'src/circuits/generated/suzuka.json').read_text('utf8'));bounds=data['elevation']['grid']['bounds'];w,s,e,n=bounds
    a,ox,oy,records=mosaic('dem5a_png',15);b,bx,by,fallback=mosaic('dem_png',14)
    xa,ya=pixels(w,n,15);xb,yb=pixels(e,s,15);x0=math.floor(xa-.5)-1;x1=math.ceil(xb-.5)+2;y0=math.floor(ya-.5)-1;y1=math.ceil(yb-.5)+2
    native=a[y0-oy:y1-oy,x0-ox:x1-ox].copy();missing=np.isnan(native);row,col=np.where(missing)
    native[row,col]=map_coordinates(b,[(y0+row+.5)/2-.5-by,(x0+col+.5)/2-.5-bx],order=1,mode='constant',cval=np.nan,prefilter=False)
    if not np.isfinite(native).all():raise ValueError('Source fallback still missing: do not synthesize values')
    payload=np.asarray(native,dtype='<f4').tobytes();mask=np.packbits(missing.ravel()).tobytes()
    notes='GSI国土地理院DEM5A(航空激光5m)与缺值处DEM10B(等高线10m)混合高程，321×321地理重采样；实际输出约7.3×4.7m，非完整5m测绘。保持米制，不放大高差。路面、看台基础、立交和2026临时设施仍需独立结构资料。'
    record={'circuitId':'suzuka','dataset':'GSI-DEM','version':'PNG-fetched-2026-10-25','coverageDataset':'GSI-DEM5A-10B','source':SOURCE,'checkedAt':'2026-10-25','publisher':'Geospatial Information Authority of Japan (GSI)','license':'PDL-1.0','terms':'https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html','specification':'https://maps.gsi.go.jp/development/demtile.html','units':'metres','valueScaleApplied':1,'encodingScaleMetres':.01,'runtimeNotes':notes,
        'runtimeSource':{'url':SOURCE,'checkedAt':'2026-10-25','method':'extracted','confidence':'medium','notes':'Processed GSI elevation tiles: DEM5A laser5m at zoom15; only missing cells use DEM10B contour10m at zoom14. Signed RGB elevation encoding in0.01m. Bilinear Web-Mercator pixel-centre/geographic resampling, no vertical scaling or visibility-fitted heights. Not a2026 circuit/stand engineering survey. Native/source fallback masks retained.'},
        'attribution':{'label':'国土地理院地形（加工）','url':SOURCE},'tiles':records+fallback,
        'nativeWindow':{'zoom':15,'pixelOrigin':[x0,y0],'size':[native.shape[1],native.shape[0]],'rowOrder':'north-to-south','dtype':'float32-le','float32Sha256':hashlib.sha256(payload).hexdigest(),'float32ZlibBase64':base64.b64encode(zlib.compress(payload,9)).decode(),'fallbackPixelCount':int(missing.sum()),'fallbackMaskZlibBase64':base64.b64encode(zlib.compress(mask,9)).decode()},
        'grid':{'bounds':bounds,'size':321,'heights':[],'referenceAltitude':0,'resolutionMetres':10},
        'limitations':'Source5m where present;10m contour fallback in missing cells, not uniform5m precision. Output spacing about7.3m east-west and4.7m north-south. Official PNG timestamps are distribution dates, not2026 survey dates. Bridges, terrace floors and stand foundations are not certified. The 2025 legacy TXT sample differs from updated2026 PNG by0.02-0.05m; current GSI listing states TXT updates stopped in2024. No offset fitted to the legacy text or to visibility is applied.'}
    record['pngControls']=[]
    for col,row in [(10,10),(120,80),(300,180),(500,300),(580,370)]:
        if missing[row,col]:continue
        gx=x0+col;gy=y0+row;tile=RAW/f'dem5a_png-15-{gx//256}-{gy//256}.png'
        rgb=list(map(int,np.asarray(Image.open(tile).convert('RGB'))[gy%256,gx%256]))
        record['pngControls'].append({'nativeIndex':[col,row],'globalPixel':[gx,gy],'layer':'dem5a_png','rgb':rgb})
    record['projectionControls']=[]
    for col,row in [(20,20),(80,80),(160,160),(240,80),(80,240),(300,300)]:
        lon=w+(e-w)*col/320;lat=s+(n-s)*row/320;x,y=pixels(lon,lat,15)
        record['projectionControls'].append({'gridIndex':[col,row],'coordinate':[lon,lat],'nativePixelCentreIndex':[float(x-.5-x0),float(y-.5-y0)]})
    rebuild(record);print('Suzuka',native.shape,'fallback',missing.sum(),'native',np.min(native),np.max(native),flush=True)

def check_source(record,save=False):
    import requests,concurrent.futures
    def check(tile):
        session=requests.Session();session.trust_env=False;r=session.get(tile['url'],timeout=25);r.raise_for_status()
        if hashlib.sha256(r.content).hexdigest()!=tile['sha256']:raise ValueError('GSI tile changed: source review required')
        if save:
            RAW.mkdir(parents=True,exist_ok=True)
            (RAW/f'{tile["layer"]}-{tile["zoom"]}-{tile["x"]}-{tile["y"]}.png').write_bytes(r.content)
        return tile['layer']
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:rows=list(ex.map(check,record['tiles']))
    print('Suzuka',len(rows),'official PNG tile hashes match',flush=True)

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--extract',action='store_true');p.add_argument('--apply',action='store_true');p.add_argument('--check-source',action='store_true');p.add_argument('--fetch',action='store_true');args=p.parse_args()
    if args.fetch:check_source(json.loads(DEST.read_text('utf8')),save=True)
    if args.extract:extract()
    if args.check_source:check_source(json.loads(DEST.read_text('utf8')))
    if args.apply:
        from regional_elevation import apply
        apply(['suzuka'])
