"""Build offline, independently lazy-loaded factual circuit packages.

Geometry: bacinger/f1-circuits (MIT). Corner registration: see alignment script.
Missing validation is kept explicit; this generator never invents corners/heights.
"""
import json, math, pathlib

root = pathlib.Path(__file__).resolve().parents[1]
read = lambda p: json.loads((root / p).read_text(encoding='utf-8'))
rows = read('research/season-manifest.json')
features = {f['properties']['id']: f for f in read('research/f1-circuits.geojson')['features']}
aligned = read('research/aligned-corners.json')
target = root / 'src/circuits/generated'
target.mkdir(exist_ok=True)
summaries, outlines = [], {}

def source(url, method, confidence, notes):
    return dict(url=url, checkedAt='2026-10-22', method=method, confidence=confidence, notes=notes)

for r in rows:
    coords = features[r['geoId']]['geometry']['coordinates']
    # Singapore's GIS source was digitized opposite to the racing direction.
    if aligned.get(r['id'], {}).get('reversed'):
        coords = list(reversed(coords))
    available = True
    official = source('https://www.formula1.com/en/racing/2026/' + r['slug'], 'published', 'high',
                      '对应赛季官方赛事页面参考；几何、高程及观众区另列来源。')
    gis = source('https://github.com/bacinger/f1-circuits/blob/master/circuits/' + r['geoId'] + '.geojson',
                 'extracted', 'medium', 'MIT地理中心线；水平投影后按公布圈长校准，不代表测绘精度')
    summary = dict(circuitId=r['id'], name=r['name'], country=r['country'], location=r['location'],
        season=2026, round=r['round'], grandPrix=r['grandPrix'], lengthMetres=r['length'],
        cornerCount=r['count'], mapAvailability='available' if available else 'preparing',
        simulationAvailability='available' if r['id']=='shanghai' else 'preparing', dataSources=[official,gis])
    zones=read('src/circuits/shanghai/zones.json') if r['id']=='shanghai' else []
    summary['spectatorZoneIds']=[z['zoneId'] for z in zones]
    summaries.append(summary)
    a = aligned.get(r['id'])
    corners = []
    if a:
        cs = source(f"https://api.multiviewer.app/api/v1/circuits/{r['key']}/2026", 'estimated', 'medium',
            f"来源布局年{a['year']}；剔除附加字母弯；闭环相似配准RMS {a['rms']:.1f}m，编号位置吸附到GIS；非测绘坐标")
        corners = [dict(number=c['number'],coordinate=c['coordinate'],source=cs) for c in a['corners']]
    if r['id']=='sepang':
        primary=read('research/sepang-corners.json')
        cs=source(primary['sourceUrl'],'estimated','medium',f"FIA 2026 Doc7第2页；4处地标相似配准RMS {primary['rmsPixels']:.1f}px，手工角点吸附最大偏移{primary['maxSnapMetres']:.1f}m；非测绘")
        corners=[dict(number=c['number'],coordinate=c['coordinate'],source=cs) for c in primary['corners']]
    if r['id']=='madrid':
        primary=read('research/madrid-corners.json')
        cs=source(primary['sourceUrl'],'estimated','medium',f"正式编号图人工选取弯心；排除5A/20A附加弯。官方SVG与GIS配准RMS{primary['rms']:.1f}m，吸附偏移最大{primary['maxSnapMetres']:.1f}m；位置约15–25m精度，非测绘")
        corners=[dict(number=c['number'],coordinate=c['coordinate'],source=cs) for c in primary['corners']]
    package = dict(**summary, trackGeometry=dict(coordinates=coords,direction=r['direction'],widthMetres=14,
        widthSource=source(official['url'],'estimated','low','统一14m示意路宽；尚无全圈逐段宽度测绘')),
        corners=corners, elevation=dict(status='unavailable',samples=[],notes='无可靠逐点高程；水平参考面，不表示真实场地平坦'),
        pitLocation=None,spectatorZones=zones,validation=dict(layout='verified' if available else 'pending',corners='verified' if corners else 'pending'))
    if r['id']=='monaco':
        width=read('src/circuits/europe/monaco-width-reference.json')
        package['trackGeometry'].update(widthMetres=width['widthMetres'],widthSource=width['source'])
    if r['id']=='montreal':
        width=read('src/circuits/americas/montreal-width-reference-2026.json')
        assert width['circuitId']==r['id'] and width['season']==2026
        package['trackGeometry'].update(widthMetres=width['widthMetres'],widthSource=width['source'])
    requests_file=root/'research/elevation-requests.json'
    if requests_file.exists():
        requests=[q for q in json.loads(requests_file.read_text()) if q['id']==r['id']]
        files=[root/f"research/elevation/{r['id']}-{q['part']}.json" for q in requests]
        if files and all(p.exists() for p in files):
            heights=[v['elevation'] for p in files for v in json.loads(p.read_text())['results']]
            if all(isinstance(h,(int,float)) for h in heights):
                package['elevation']=dict(status='partial',samples=[],
                    source=source('https://www.opentopodata.org/datasets/srtm/','extracted','medium','SRTM v3 90m区域DEM，17×17离线网格，双线性插值；不是赛道路面测绘'),
                    notes='SRTM90m区域地形估算；不解析路肩横坡、桥梁和隧道。铃鹿立交净空尚无资料。',
                    grid=dict(bounds=requests[0]['bounds'],size=requests[0]['size'],heights=heights,referenceAltitude=min(heights),resolutionMetres=90))
    bridges=root/f"src/circuits/{r['id']}/overpasses.json"
    if bridges.exists():
        package['elevation']['overpasses']=json.loads(bridges.read_text(encoding='utf-8'))
        package['elevation']['notes']+='；立交桥面间距为估计，非实测净空，见地图说明。'
    (target/(r['id']+'.json')).write_text(json.dumps(package,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    # Small, individual true geographic outlines, without loading 23 map packages.
    x=[p[0]*math.cos(math.radians(coords[0][1])) for p in coords]; y=[-p[1] for p in coords]
    w,h=max(x)-min(x),max(y)-min(y); s=min(360/w,240/h)
    points=[(round((xx-min(x))*s+20+(360-w*s)/2,2),round((yy-min(y))*s+20+(240-h*s)/2,2)) for xx,yy in zip(x,y)]
    outlines[r['id']]=dict(path=' '.join(('M' if i==0 else 'L')+str(p[0])+','+str(p[1]) for i,p in enumerate(points)),start=points[0])

(target/'summaries.json').write_text(json.dumps(summaries,ensure_ascii=False,indent=2),encoding='utf-8')
(target/'outlines.json').write_text(json.dumps(outlines,separators=(',',':')),encoding='utf-8')
print(f'Built {len(summaries)} packages; all maps have independently registered corners')
