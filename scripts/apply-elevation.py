"""Apply verified cached SRTM responses without rebuilding spectator geometry.

The source DEM is regional surface elevation, not circuit engineering data.
Shanghai's retained engine remains on its original datum pending a separate
compatibility migration; its acquired grid is retained in the data package.
"""
import hashlib,json,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
requests=json.loads((root/'research/elevation-requests.json').read_text(encoding='utf-8'))
coverage=[]
for summary in json.loads((root/'src/circuits/generated/summaries.json').read_text(encoding='utf-8')):
    cid=summary['circuitId'];parts=sorted((r for r in requests if r['id']==cid),key=lambda r:r['part'])
    values=[];hashes=[]
    for part in parts:
        path=root/f'research/elevation/{cid}-{part["part"]}.json';raw=path.read_bytes();response=json.loads(raw)
        if response.get('status')!='OK':raise ValueError(f'{cid}: failed response')
        rows=response['results']
        if any(r.get('dataset')!='srtm90m' for r in rows):raise ValueError(f'{cid}: unexpected dataset')
        values.extend(r['elevation'] for r in rows);hashes.append(hashlib.sha256(raw).hexdigest())
    size=parts[0]['size']
    if len(values)!=size**2 or not all(isinstance(v,(int,float)) and math.isfinite(v) for v in values):
        raise ValueError(f'{cid}: incomplete elevation data')
    path=root/f'src/circuits/generated/{cid}.json';data=json.loads(path.read_text(encoding='utf-8'))
    bridges=data['elevation'].get('overpasses')
    data['elevation']={
        'status':'partial','samples':[],
        'source':{'url':'https://www.opentopodata.org/datasets/srtm/','checkedAt':'2026-10-24','method':'extracted','confidence':'medium',
            'notes':'SRTM v3 90m regional DEM, 17×17 cached grid. Source surface elevations may include vegetation/buildings; not surveyed track, seating or tunnel elevations.'},
        'notes':'SRTM90m 区域地形估算，真实米制高差；不解析路肩、看台基础、桥梁或隧道。城市建筑与植被可能影响表面高程。',
        'grid':{'bounds':parts[0]['bounds'],'size':size,'heights':values,'referenceAltitude':min(values),'resolutionMetres':90}}
    if bridges:data['elevation']['overpasses']=bridges
    if cid=='shanghai':data['elevation']['notes']+=' 上海旧引擎暂保留原水平基准；本数据包已收录高程，尚未替换旧引擎物理地面。'
    path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf-8')
    coverage.append({'circuitId':cid,'dataset':'srtm90m','sampleCount':len(values),'minMetres':min(values),'maxMetres':max(values),'responseSha256':hashes,
        'runtimeApplied':cid!='shanghai','checkedAt':'2026-10-24','source':data['elevation']['source']['url']})
destination=root/'src/circuits/elevation-source';destination.mkdir(exist_ok=True)
(destination/'coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n','utf-8')
print(f'{len(coverage)} complete sourced grids; Shanghai compatibility migration remains separate')
# Retain explicitly reviewed bare-earth replacements when rebuilding SRTM data.
import subprocess,sys
subprocess.run([sys.executable,str(root/'scripts/ground_elevation.py'),'--apply'],check=True)
