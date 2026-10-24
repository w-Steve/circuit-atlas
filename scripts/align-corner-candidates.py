import json,pathlib,numpy as np
N=512
features={f['properties']['id']:f for f in json.load(open('research/f1-circuits.geojson'))['features']}
manifest=json.load(open('research/season-manifest.json',encoding='utf-8'))
def resample(p,n=N):
 p=np.asarray(p,float);p=np.vstack([p,p[0]]) if np.linalg.norm(p[-1]-p[0])>1e-6 else p
 keep=np.r_[True,np.linalg.norm(np.diff(p,axis=0),axis=1)>1e-6];p=p[keep];d=np.r_[0,np.cumsum(np.linalg.norm(np.diff(p,axis=0),axis=1))];t=np.arange(n)/n*d[-1];return np.stack([np.interp(t,d,p[:,i]) for i in range(2)],axis=1)
def fit(a,b):
 ac=a-a.mean(0);bc=b-b.mean(0);u,s,vt=np.linalg.svd(ac.T@bc);r=u@vt;k=s.sum()/(ac*ac).sum();t=b.mean(0)-a.mean(0)@r*k;err=np.sqrt(np.mean(np.sum((a@r*k+t-b)**2,axis=1)));return err,r,k,t
report=[];out={}
for m in manifest:
 coords=np.array(features[m['geoId']]['geometry']['coordinates'])[:,:2];origin=coords[0];factor=np.array([111320*np.cos(origin[1]*np.pi/180),-111320]);geo=(coords-origin)*factor
 path=pathlib.Path(f"research/corner-candidates/{m['key']}.json")
 if not path.exists():report.append(dict(id=m['id'],status='missing-corners'));continue
 mv=json.loads(path.read_text());a=resample(np.c_[mv['x'],mv['y']]);base=resample(geo);best=None
 for rev in [False,True]:
  b=base[::-1] if rev else base
  for shift in range(N):
   bb=np.roll(b,shift,axis=0);err,r,k,t=fit(a,bb)
   if best is None or err<best[0]:best=(err,r,k,t,rev,shift)
 err,r,k,t,rev,shift=best
 # Refine starting phase below the 512-sample coarse interval.
 b=base[::-1] if rev else base
 for phase in np.linspace(shift-1,shift+1,81):
  pos=(np.arange(N)-phase)%N;bb=np.stack([np.interp(pos,np.arange(N+1),np.r_[b[:,j],b[0,j]]) for j in range(2)],axis=1);v,rr,kk,tt=fit(a,bb)
  if v<err:err,r,k,t=v,rr,kk,tt
 corners=[];vectors=geo[1:]-geo[:-1];lens=np.linalg.norm(vectors,axis=1);d=np.r_[0,np.cumsum(lens)]
 for c in mv['corners']:
  if c.get('letter'):continue
  p=np.array([c['trackPosition']['x'],c['trackPosition']['y']])@r*k+t
  u=np.clip(np.sum((p-geo[:-1])*vectors,axis=1)/np.maximum(lens*lens,1e-9),0,1);q=geo[:-1]+u[:,None]*vectors;dist=np.linalg.norm(q-p,axis=1);j=np.argmin(dist);ll=origin+q[j]/factor
  corners.append(dict(number=c['number'],coordinate=ll.tolist(),snapErrorMetres=float(dist[j]),fraction=float((d[j]+u[j]*lens[j])/d[-1])))
 fractions=[c['fraction'] for c in corners];wraps=sum(b<a for a,b in zip(fractions,fractions[1:]));ordered=wraps<=1
 out[m['id']]=dict(corners=corners,rms=float(err),year=mv['year'],reversed=rev,ordered=ordered,scale=float(k))
 report.append(dict(id=m['id'],rms=round(err,2),year=mv['year'],corners=len(corners),expected=m['count'],maxSnap=round(max(c['snapErrorMetres'] for c in corners),2),ordered=ordered,reversed=rev))
pathlib.Path('research/aligned-corners.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
pathlib.Path('research/alignment-report.json').write_text(json.dumps(report,indent=2))
for r in report:print(r)
