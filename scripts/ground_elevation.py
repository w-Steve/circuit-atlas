"""Acquire small GEDTM30 v1.2 COG windows, or reapply their retained grids.

Acquisition needs rasterio/numpy (not browser dependencies). Example:
  python ground_elevation.py --fetch singapore monaco
  python ground_elevation.py --apply
Only --fetch accesses the network; the application remains entirely static.
"""
import argparse, hashlib, json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'src/circuits/elevation-source/ground-grids'
URL = 'https://s3.opengeohub.org/global/dtm/v1.2/gedtm_rf_m_30m_s_20060101_20151231_go_epsg.4326.3855_v1.2.tif'
MIRROR = 'https://opentopography.s3.sdsc.edu/raster/GEDTM30/GEDTM30_be/gedtm_rf_m_30m_s_20060101_20151231_go_epsg.4326.3855_v1.2.tif'
SOURCE = 'https://zenodo.org/records/18887460'

def acquire(ids,mirror=False):
    import numpy as np
    import rasterio
    from rasterio.windows import Window, from_bounds
    DEST.mkdir(exist_ok=True)
    with rasterio.Env(GDAL_HTTP_PROXY='127.0.0.1:7890', GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',
                      CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_TIMEOUT='40',
                      GDAL_HTTP_MAX_RETRY='3',GDAL_HTTP_RETRY_DELAY='2',GDAL_HTTP_VERSION='1.1'):
        raster_url=MIRROR if mirror else URL
        with rasterio.open('/vsicurl/' + raster_url) as ds:
            if ds.dtypes != ('float32',) or ds.crs.to_epsg() != 4326:
                raise ValueError('Unexpected source product; recheck units and georeferencing')
            for cid in ids:
                data=json.loads((ROOT/f'src/circuits/generated/{cid}.json').read_text('utf-8'))
                bounds=data['elevation']['grid']['bounds'];west,south,east,north=bounds
                window=from_bounds(*bounds,ds.transform)
                # Preserve a full native-pixel border for interpolation at the bounds.
                col,row=math.floor(window.col_off)-1,math.floor(window.row_off)-1
                width,height=math.ceil(window.width)+3,math.ceil(window.height)+3
                raw=ds.read(1,window=Window(col,row,width,height),masked=True)
                if np.any(np.ma.getmaskarray(raw)) or not np.isfinite(raw).all():
                    raise ValueError(f'{cid}: missing source pixels; no synthetic filling allowed')
                size=65;values=[]
                for lat in np.linspace(south,north,size):
                    for lon in np.linspace(west,east,size):
                        x,y=(~ds.transform)*(lon,lat);x-=col+.5;y-=row+.5
                        i,j=math.floor(x),math.floor(y);u,v=x-i,y-j
                        value=(raw[j,i]*(1-u)+raw[j,i+1]*u)*(1-v)+(raw[j+1,i]*(1-u)+raw[j+1,i+1]*u)*v
                        values.append(round(float(value),3))
                # v1.2 is Float32 in metres (Zenodo metadata scale=1). The COG
                # retains a legacy .1 scale tag from its Int32 predecessor.
                # Applying it again would shrink Monaco's real ~200m hills tenfold.
                record={'circuitId':cid,'dataset':'GEDTM30','version':'1.2.0','source':SOURCE,'rasterUrl':raster_url,
                    'authors':['Yufeng Ho','Tom Hengl','OpenGeoHub'],'license':'CC-BY-4.0','checkedAt':'2026-10-24',
                    'units':'metres','valueScaleApplied':1,'cogLegacyScaleTag':ds.scales[0],
                    'unitEvidence':'v1.2 Zenodo layer table specifies Float32, scale 1; stored values are already metres. Mont Blanc source pixel at 6.8652,45.8326 reads 4795.7002, not 47957 or 479.57.',
                    'extraction':'Bilinear interpolation of native 1-arc-second pixel centres; 65x65 output. No smoothing, height exaggeration, clipping or fabricated sea-level replacement.',
                    'nativeWindow':{'column':col,'row':row,'width':width,'height':height,
                        'transform':list(ds.transform)[:6],'float32Sha256':hashlib.sha256(np.asarray(raw,dtype='<f4').tobytes()).hexdigest()},
                    'grid':{'bounds':bounds,'size':size,'heights':values,'referenceAltitude':min(values),'resolutionMetres':30}}
                target=DEST/f'{cid}.json'
                if target.exists():
                    old=json.loads(target.read_text('utf-8'))
                    if old['nativeWindow']['float32Sha256']!=record['nativeWindow']['float32Sha256'] or old['grid']!=record['grid']:
                        raise ValueError(f'{cid}: upstream pixels changed; manual source review required')
                    print(f'{cid}: mirror/source native pixels and retained grid match exactly',flush=True)
                    continue
                target.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf-8')
                print(f'{cid}: {len(values)} samples, {min(values):.2f}..{max(values):.2f} m',flush=True)

def apply(ids=None):
    coverage_path=ROOT/'src/circuits/elevation-source/coverage.json'
    coverage=json.loads(coverage_path.read_text('utf-8'))
    for source in sorted(DEST.glob('*.json')):
        raw=source.read_bytes();record=json.loads(raw);cid=record['circuitId'];grid=record['grid']
        if ids and cid not in ids:continue
        if len(grid['heights'])!=grid['size']**2 or not all(math.isfinite(v) for v in grid['heights']):raise ValueError(cid)
        path=ROOT/f'src/circuits/generated/{cid}.json';data=json.loads(path.read_text('utf-8'))
        from uk_ea_elevation import retain_applied_elevation
        if retain_applied_elevation(cid,data['elevation']):continue
        elevation=data['elevation']
        elevation.update({'status':'partial','samples':[],'grid':grid,
            'source':{'url':SOURCE,'checkedAt':record['checkedAt'],'method':'extracted','confidence':'medium',
                'notes':'GEDTM30 v1.2.0, Ho and Hengl / OpenGeoHub, CC BY 4.0. Predicted bare-earth regional DTM, native 1 arc second (~30m); bilinear 65x65 extraction. Not surveyed road, bridge, stand or tunnel elevations.'},
            'notes':'GEDTM30 v1.2 约30m地面高程估算，65×65双线性取样；真实米制高差，不放大。用于减少建筑与植被表面干扰，仍非赛道路面、看台基础或桥隧测绘。'})
        if cid=='shanghai':
            elevation['roadModel']={'smoothingSigmaMetres':45,'source':{'url':SOURCE,'checkedAt':record['checkedAt'],'method':'estimated','confidence':'low','notes':'Estimated road profile: periodic Gaussian distance interpolation of GEDTM30 with sigma 45m (1.5 native cells), without height rescaling or slope clipping. Engineering paper Huang et al., CJGE 35(7), 2013, Fig.15 confirms earthworks and almost 8m road relief, but is not a current road survey. Native regional ground is retained separately.'}}
            elevation['notes']+=' 上海路面由原地面沿线45m高斯距离插值估算，消除原DTM无法分辨的短坡，不放大高差；非2026路面测绘。历史工程论文确认堆筑赛道约8m落差，不据此人为拉伸高程。'
            paper='https://cgejournal.com/cn/article/pdf/preview/15108.pdf'
            if not any(s['url']==paper for s in data['dataSources']):
                data['dataSources'].append({'url':paper,'checkedAt':record['checkedAt'],'method':'published','confidence':'medium','notes':'Huang Shao-ming, Yue Jian-yong, Huang Yu-ting (2013), CJGE 35(7), 1228-1238, section 4.1 and Fig.15: historical earthworks, nearly 8m road relief, Wu-Song vertical datum. Used only as historical corroboration; no surveyed 2026 profile or image is reproduced. GEDTM orthometric values must not be equated with this historical datum.'})
        path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf-8')
        row=next(r for r in coverage if r['circuitId']==cid)
        if row['dataset']=='srtm90m':row['srtmBaseline']={k:row[k] for k in ['sampleCount','minMetres','maxMetres','responseSha256','source']}
        row.update({'dataset':'GEDTM30-v1.2','sampleCount':len(grid['heights']),'minMetres':min(grid['heights']),
            'maxMetres':max(grid['heights']),'responseSha256':[hashlib.sha256(raw).hexdigest()],
            'runtimeApplied':True,'source':SOURCE,'checkedAt':record['checkedAt']})
    coverage_path.write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n','utf-8')
    # Reviewed regional products supersede the coarse global baseline offline.
    from regional_elevation import apply as apply_regional
    apply_regional(ids)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--fetch',nargs='+');parser.add_argument('--apply',action='store_true');parser.add_argument('--mirror',action='store_true',help='Use the official OpenTopography public COG distribution')
    parser.add_argument('--only',nargs='+',help='Limit --apply to these retained circuit grids')
    args=parser.parse_args()
    if args.fetch:acquire(args.fetch,args.mirror)
    if args.apply:apply(args.only)
