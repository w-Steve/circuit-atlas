"""Bounded geographic reference for Rocher. Raw government tiles stay in research.

This acquires a reference frame, not a 2026 admission boundary or a height model.
Use --offline to revalidate cached bytes without network requests.
"""
import argparse,hashlib,io,json,math
from pathlib import Path
import requests
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
BASE='https://tiles.arcgis.com/tiles/DkYiS0lDHb5soLgl/arcgis/rest/services/SIGM_Topographie_OGC_2/MapServer'
CACHE=ROOT/'research/season-review/monaco2026/rocher-topography'
ZOOM=17
def tile_at(lon,lat):
    return (int((lon+180)/360*2**ZOOM),int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**ZOOM))
def geographic(global_x,global_y):
    n=256*2**ZOOM
    return [global_x/n*360-180,math.degrees(math.atan(math.sinh(math.pi*(1-2*global_y/n))))]

def build(offline=False):
    CACHE.mkdir(parents=True,exist_ok=True)
    def acquire(url,path):
        if path.exists():return path.read_bytes()
        if offline:raise ValueError(f'Missing cached reference: {path.name}')
        session=requests.Session();session.trust_env=False
        try:response=session.get(url,timeout=25)
        except requests.RequestException:response=session.get(url,proxies={'https':'http://127.0.0.1:7890'},timeout=25)
        response.raise_for_status();raw=response.content;path.write_bytes(raw);return raw
    raw=acquire(BASE+'?f=pjson',CACHE/'metadata.json');meta=json.loads(raw)
    assert meta['spatialReference']['latestWkid']==3857
    assert meta['tileInfo']['rows']==meta['tileInfo']['cols']==256
    assert '2023' in meta['description'] and 'Monaco' in meta['copyrightText'],'Reinspect changed source revision'
    x0,y0=tile_at(7.4165,43.737);x1,y1=tile_at(7.429,43.728)
    assert (x1-x0+1)*(y1-y0+1)==25
    mosaic=Image.new('RGB',((x1-x0+1)*256,(y1-y0+1)*256));tiles=[]
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            path=CACHE/f'{ZOOM}-{x}-{y}.png';url=f'{BASE}/tile/{ZOOM}/{y}/{x}'
            raw=acquire(url,path);im=Image.open(io.BytesIO(raw));im.load()
            assert im.format=='PNG' and im.size==(256,256),'Not a standard reference tile'
            mosaic.paste(im.convert('RGB'),((x-x0)*256,(y-y0)*256))
            tiles.append({'x':x,'y':y,'sha256':hashlib.sha256(raw).hexdigest()})
    output=ROOT/'artifacts/goal-review/monaco-rocher-topography.png';output.parent.mkdir(parents=True,exist_ok=True);mosaic.save(output)
    nw=geographic(x0*256,y0*256);se=geographic((x1+1)*256,(y1+1)*256)
    record={'circuitId':'monaco','season':2026,'checkedAt':'2026-10-27','sourceUrl':BASE,
        'sourceVersion':'April 2023, per government service metadata','credit':meta['copyrightText'],
        'sourceMetadataSha256':hashlib.sha256((CACHE/'metadata.json').read_bytes()).hexdigest(),
        'sourceCrs':'EPSG:3857','outputCoordinates':'EPSG:4326 longitude/latitude',
        'zoom':ZOOM,'tileSize':256,'topLeftTile':[x0,y0],'mosaicPixels':list(mosaic.size),
        'geographicBounds':[nw[0],se[1],se[0],nw[1]],'tiles':tiles,
        'pixelToGeographic':'For local pixel u,v: global x=256*tileX+u, y=256*tileY+v; Web Mercator XYZ inverse at zoom 17.',
        'registrationReady':False,'runtimeGeometryChanged':False,
        'nextAction':'Match identifiable street junctions or persistent landmark vertices in both the 2026 public artwork and this georeferenced reference. Surround all four Rocher pieces; check non-folding and independent residuals before generating world polygons.',
        'limits':'Reference roads/buildings are from a 2023 base map, not evidence of 2026 admission, temporary platforms or barriers. No source tile is bundled into the app. Display resolution is not survey accuracy; this source does not supply heights or certify control correspondences.'}
    target=ROOT/'src/circuits/season-review/monaco-rocher-geographic-reference.json'
    target.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
    print('Rocher reference: 25 validated tiles, 1280x1280 georeferenced mosaic; world registration not enabled')
    return record

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--offline',action='store_true');build(parser.parse_args().offline)
