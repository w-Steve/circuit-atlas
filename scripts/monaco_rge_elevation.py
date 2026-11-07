"""Bake/rebuild an IGN regional grid, preserving the prior terrain for recovery.
Only explicit regional --preview can apply the result before scene acceptance.
"""
import base64,hashlib,json,math,sys
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'src/circuits/elevation-source/regional-grids/monaco-ign-rge.json'
read=lambda p:json.loads((ROOT/p).read_text('utf8'))

def sample(native,bounds,lon,lat):
 w,s,e,n=bounds;size=native.shape[0];x=(lon-w)/(e-w)*(size-1);y=(lat-s)/(n-s)*(size-1)
 if not 0<=x<=size-1 or not 0<=y<=size-1:raise ValueError('No extrapolation')
 i=min(size-2,int(x));j=min(size-2,int(y));u=x-i;v=y-j
 values=native[j:j+2,i:i+2]
 if not np.isfinite(values).all():return None
 return float(values[0,0]*(1-u)*(1-v)+values[0,1]*u*(1-v)+values[1,0]*(1-u)*v+values[1,1]*u*v)

def rebuild(record,path):
 n=record['nativeWindow'];raw=base64.b64decode(n['float32Base64'],validate=True)
 if hashlib.sha256(raw).hexdigest()!=n['float32Sha256']:raise ValueError('Native source changed')
 values=np.frombuffer(raw,dtype='<f4').reshape(n['size'][1],n['size'][0]);grid=record['grid'];w,s,e,north=grid['bounds'];heights=[];overrides=0
 for j in range(grid['size']):
  for i in range(grid['size']):
   lon=w+i*(e-w)/(grid['size']-1);lat=s+j*(north-s)/(grid['size']-1);height=sample(values,record['nativeWindow']['bounds'],lon,lat)
   if height is None:
    match=[p for p in record['directEdgeProbes'] if p['valid'] and abs(p['lon']-lon)<5e-8 and abs(p['lat']-lat)<5e-8]
    if len(match)!=1:raise ValueError('Missing interpolation support without a direct source query')
    height=match[0]['metres'];overrides+=1
   heights.append(round(height,3))
 if overrides!=4 or not all(math.isfinite(v) for v in heights):raise ValueError('Unexpected edge handling')
 changed=grid['heights']!=heights
 grid['heights']=heights
 if changed:record['sceneAcceptance']={'accepted':False,'reason':'Regional terrain changed; repeat simulation review.'}
 path.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')

def build():
 candidate=read('src/circuits/europe/monaco-rge-alti-candidate.json');qa=read('src/circuits/season-review/monaco-terrain-source-review.json')
 sha=hashlib.sha256((ROOT/'src/circuits/europe/monaco-rge-alti-candidate.json').read_bytes()).hexdigest()
 if sha!=qa['candidateSha256'] or candidate['licenseId']!='lov2':raise ValueError('Unreviewed source identity/license')
 previous=json.loads(OUT.read_text('utf8')) if OUT.exists() else {}
 old=previous.get('previousElevation',read('src/circuits/generated/monaco.json')['elevation'])
 a=np.array([float('nan') if h is None else h for h in candidate['heights']],dtype='<f4');raw=a.tobytes();bounds=old['grid']['bounds']
 source=dict(url=candidate['licenseEvidence'],checkedAt='2026-10-26',method='extracted',confidence='medium',notes='IGN RGE ALTI via Géoplateforme, native1m product sampled about8×10m then resampled to the existing frame. Acquisition density/date/accuracy vary or are unknown; four edge nodes use retained direct API queries. Not a road/bridge/platform survey.')
 record=dict(circuitId='monaco',dataset='IGN-RGE-ALTI',coverageDataset='IGN-RGE-ALTI-2026-10-26',source=candidate['sourceUrl'],checkedAt='2026-10-26',candidateSha256=sha,
  previousElevation=old,runtimeSource=source,runtimeNotes='IGN RGE ALTI区域地面候选，原生产品1m格距、API采样约8×10m，保留真实米制高差；129×129重采样，4个边缘点来自独立直接查询。采集密度/日期与垂直精度不明或变化，不是赛道路面、桥隧、看台平台测绘。',
  attribution=dict(label='IGN · RGE ALTI',url=candidate['licenseEvidence']),
  nativeWindow=dict(size=[candidate['size'],candidate['size']],bounds=candidate['bounds'],epsg=4326,rowOrder=candidate['rowOrder'],nodata='NaN',float32Base64=base64.b64encode(raw).decode(),float32Sha256=hashlib.sha256(raw).hexdigest()),
  grid=dict(bounds=bounds,size=129,referenceAltitude=old['grid']['referenceAltitude'],resolutionMetres=max(candidate['samplingMetres'].values()),heights=[]),
  directEdgeProbes=qa['directEdgeProbes'],directEdgeResponseSha256=qa['directEdgeResponseSha256'],acquisitionPalette=candidate['acquisitionPalette'],acquisitionClasses=candidate['acquisitionClasses'],
  sceneAcceptance={'accepted':False,'reason':'Awaiting all currently available Monaco zones.'})
 # Report the actual retained sampling pitch, not the native product spacing.
 record['grid']['resolutionMetres']=max(record['grid']['resolutionMetres'],(bounds[3]-bounds[1])*111320/128)
 rebuild(record,OUT)
 if previous.get('grid')==record['grid'] and previous.get('runtimeSource')==source and previous.get('sceneAcceptance'):
  record['sceneAcceptance']=previous['sceneAcceptance'];OUT.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('Monaco regional grid baked:129x129 finite heights,4 direct edge queries; scene accepted:',record['sceneAcceptance'].get('accepted',False))

if __name__=='__main__':build()
