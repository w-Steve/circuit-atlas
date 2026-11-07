"""Reapply reviewed regional DEM grids offline. Native values remain retained.
Fetch validation: --check-source downloads the recorded WCS window or numeric
PNG tiles, refusing changed source values rather than silently replacing them.
"""
import argparse,base64,hashlib,json,math,zlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'src/circuits/elevation-source/regional-grids'

def apply(ids=None,preview=False):
    coverage_path=ROOT/'src/circuits/elevation-source/coverage.json'
    coverage=json.loads(coverage_path.read_text('utf8'))
    for source in sorted(DEST.glob('*.json')):
        raw=source.read_bytes();record=json.loads(raw);cid=record['circuitId']
        if ids and cid not in ids:continue
        if record['dataset']=='IGN-RGE-ALTI' and not record.get('sceneAcceptance',{}).get('accepted') and not preview:
            if ids:raise ValueError('IGN Monaco terrain needs scene acceptance or explicit --preview')
            print('Skipping unaccepted IGN Monaco terrain');continue
        grid=record['grid'];native=record['nativeWindow'];payload=base64.b64decode(native.get('float32Base64',native.get('float32ZlibBase64','')),validate=True)
        if 'float32ZlibBase64' in native:payload=zlib.decompress(payload)
        if hashlib.sha256(payload).hexdigest()!=native['float32Sha256']:raise ValueError('Native window changed')
        if len(payload)!=native['size'][0]*native['size'][1]*4 or len(grid['heights'])!=grid['size']**2 or not all(math.isfinite(v) for v in grid['heights']):raise ValueError('Invalid regional grid')
        path=ROOT/f'src/circuits/generated/{cid}.json';data=json.loads(path.read_text('utf8'))
        source=record.get('runtimeSource') or {'url':record['source'],'checkedAt':record['checkedAt'],'method':'extracted','confidence':'medium',
                'notes':'Tarquini S., Isola I., Favalli M., Battistini A., Dotta G. (2023), TINITALY 1.1, INGV, CC BY4.0. Native 10m Float32 bare-earth DEM in EPSG:32632; bilinear pixel-centre resampling without height rescaling. Regional source, not a 2026 road/stand/fence survey.'}
        # Prepare the entire replacement before writing, and protect unrelated edits.
        replacement=dict(data['elevation'])
        replacement.update({'status':'partial','samples':[],'grid':grid,'source':source,
            'notes':record.get('runtimeNotes','TINITALY 1.1 / INGV 10m区域裸地高程，257×257地理网格双线性重采样，垂直单位保持米；横向部分过采样不提升原生10m精度。非2026赛道、草地平台或围网基础测绘。')})
        if record.get('attribution'):replacement['attribution']=record['attribution']
        else:replacement.pop('attribution',None)
        if record['dataset']=='IGN-RGE-ALTI' and data['elevation'] not in (record['previousElevation'],replacement):
            raise ValueError('Monaco elevation differs from the retained baseline and intended replacement; preserve edits and review')
        data['elevation']=replacement
        if not any(s['url']==source['url'] for s in data['dataSources']):
            data['dataSources'].append(data['elevation']['source'])
        path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
        row=next(r for r in coverage if r['circuitId']==cid)
        baseline=ROOT/f'src/circuits/elevation-source/ground-grids/{cid}.json'
        if baseline.exists() and 'gedtmBaseline' not in row:
            base_raw=baseline.read_bytes();base=json.loads(base_raw);bg=base['grid']
            row['gedtmBaseline']={'dataset':'GEDTM30-v1.2','sampleCount':len(bg['heights']),
                'minMetres':min(bg['heights']),'maxMetres':max(bg['heights']),
                'source':base['source'],'responseSha256':[hashlib.sha256(base_raw).hexdigest()]}
        row.update({'dataset':record.get('coverageDataset','TINITALY-1.1'),'sampleCount':len(grid['heights']),'minMetres':min(grid['heights']),
            'maxMetres':max(grid['heights']),'responseSha256':[hashlib.sha256(raw).hexdigest()],
            'runtimeApplied':True,'source':source['url'],'checkedAt':record['checkedAt']})
    coverage_path.write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n','utf8')
    from uk_ea_elevation import apply as apply_ea
    apply_ea(ids,optional=True)

def check_source():
    import io,requests,numpy as np
    from PIL import Image
    for p in DEST.glob('*.json'):
        record=json.loads(p.read_text('utf8'));session=requests.Session();session.trust_env=False
        if record['dataset']=='GSI-DEM':
            from gsi_elevation import check_source as check_gsi
            check_gsi(record);continue
        if record['dataset']=='IGN-RGE-ALTI':
            raise ValueError('IGN source is a retained API snapshot, not an immutable WCS window. Replay fetch-monaco-rge.py --offline and audit-monaco-rge.py; new live acquisitions require a separate source review.')
        response=session.get(record['requestUrl'],timeout=40);response.raise_for_status()
        image=Image.open(io.BytesIO(response.content));values=np.asarray(image,dtype='<f4')
        n=record['nativeWindow'];transform=image.tag_v2.get(34264)
        expected=(10.,0.,0.,float(n['bbox'][0]),0.,-10.,0.,float(n['bbox'][3]),0.,0.,0.,0.,0.,0.,0.,1.)
        if transform!=expected or 32632 not in image.tag_v2.get(34735,()):raise ValueError('WCS georeferencing changed')
        if image.mode!='F' or list(image.size)!=record['nativeWindow']['size'] or hashlib.sha256(values.tobytes()).hexdigest()!=record['nativeWindow']['float32Sha256']:raise ValueError('WCS data changed; source review required')
        print(record['circuitId'],response.status_code,'native Float32 hash matches retained source',flush=True)

def rebuild():
    import numpy as np
    from pyproj import Transformer
    from scipy.ndimage import map_coordinates
    for p in DEST.glob('*.json'):
        record=json.loads(p.read_text('utf8'));n=record['nativeWindow'];g=record['grid'];w,s,e,north=g['bounds'];size=g['size']
        if record['dataset']=='GSI-DEM':
            from gsi_elevation import rebuild as rebuild_gsi
            rebuild_gsi(record,p);continue
        if record['dataset']=='IGN-RGE-ALTI':
            from monaco_rge_elevation import rebuild as rebuild_ign
            rebuild_ign(record,p);continue
        native=np.frombuffer(base64.b64decode(n['float32Base64']),dtype='<f4').reshape(n['size'][1],n['size'][0])
        lon,lat=np.meshgrid(np.linspace(w,e,size),np.linspace(s,north,size))
        x,y=Transformer.from_crs(4326,n['epsg'],always_xy=True).transform(lon,lat)
        px=(x-n['bbox'][0])/10-.5;py=(n['bbox'][3]-y)/10-.5
        if px.min()<0 or py.min()<0 or px.max()>=n['size'][0]-1 or py.max()>=n['size'][1]-1:raise ValueError('Source border insufficient: no extrapolation allowed')
        values=map_coordinates(native,[py,px],order=1,mode='constant',cval=np.nan,prefilter=False)
        if not np.isfinite(values).all() or (native==n['nodata']).any():raise ValueError('No synthetic filling of missing cells')
        g['heights']=[round(float(v),3) for v in values.ravel()];g['referenceAltitude']=min(g['heights'])
        p.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');p.add_argument('--only',nargs='+');p.add_argument('--check-source',action='store_true');p.add_argument('--rebuild',action='store_true');p.add_argument('--preview',action='store_true');args=p.parse_args()
    if args.rebuild:rebuild()
    if args.check_source:check_source()
    if args.apply:apply(args.only,args.preview)
