"""Register the organizer's current SVG centerline against the MIT GIS.
Numbered organizer diagram visually checked in research/madrid-numbered-map.png.
Apices are manually digitized in the organizer SVG's native viewBox, then
registered to MIT geography. Official image/path assets are not shipped.
"""
import json,re,pathlib,numpy as np
root=pathlib.Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text(encoding='utf-8'))
ll=np.array(read('src/circuits/generated/madrid.json')['trackGeometry']['coordinates']);origin=ll[0]
factor=np.array([111320*np.cos(origin[1]*np.pi/180),-111320]);geo=(ll-origin)*factor
ref=np.array(read('research/madrid-reference.json')['points'])
n=len(ref);lens=np.linalg.norm(np.diff(geo,axis=0),axis=1);distance=np.r_[0,np.cumsum(lens)]
base=np.stack([np.interp(np.arange(n)/n*distance[-1],distance,geo[:,i]) for i in range(2)],axis=1)
def fit(a,b):
    ac=a-a.mean(0);bc=b-b.mean(0);u,s,vt=np.linalg.svd(ac.T@bc);r=u@vt;k=s.sum()/(ac*ac).sum();t=b.mean(0)-a.mean(0)@r*k
    return np.sqrt(np.mean(np.sum((a@r*k+t-b)**2,axis=1))),r,k,t
best=None
for reversed in [False,True]:
    b=base[::-1] if reversed else base
    for shift in range(n):
        result=fit(ref,np.roll(b,shift,axis=0))
        if best is None or result[0]<best[0]:best=(*result,reversed,shift)
rms,rotation,scale,translation,reversed,shift=best
print('Madrid current official SVG/GIS RMS metres',rms,'reversed',reversed)
apices=np.array([[157,395],[130,392],[124,327],[466,141],[566,171],[602,169],
    [751,113],[782,136],[832,113],[910,114],[967,160],[1109,194],
    [853,154],[787,222],[666,251],[651,350],[662,389],[567,447],
    [540,570],[370,611],[380,685],[230,722]])
estimated=apices@rotation*scale+translation
segments=geo[1:]-geo[:-1];corners=[]
for i,p in enumerate(estimated):
    fraction=np.clip(np.sum((p-geo[:-1])*segments,axis=1)/(lens*lens),0,1)
    q=geo[:-1]+fraction[:,None]*segments;error=np.linalg.norm(q-p,axis=1);j=error.argmin()
    corners.append(dict(number=i+1,coordinate=(origin+q[j]/factor).tolist(),snapErrorMetres=float(error[j]),fraction=float((distance[j]+fraction[j]*lens[j])/distance[-1])))
output=dict(rms=float(rms),reversed=reversed,corners=corners,maxSnapMetres=max(c['snapErrorMetres'] for c in corners),
    sourceUrl='https://www.madring.com/circuito',method='Official numbered organizer diagram, visually digitized apices; excluded 5A/20A supplemental bends; approximate positions, not survey',apices=apices.tolist())
(root/'research/madrid-corners.json').write_text(json.dumps(output,indent=2),encoding='utf-8')
print('maximum corner residual',output['maxSnapMetres'])
