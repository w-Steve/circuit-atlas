"""Facts digitized from FIA 2026 Bahrain-in-Malaysia Doc7 p2, rendered at 1.5x.
No official imagery is shipped by the application. Coordinates are estimates.
"""
import json,pathlib,numpy as np
root=pathlib.Path(__file__).resolve().parents[1]
d=json.loads((root/'src/circuits/generated/sepang.json').read_text(encoding='utf-8'))
ll=np.array(d['trackGeometry']['coordinates']);origin=ll[0]
factor=np.array([111320*np.cos(origin[1]*np.pi/180),-111320]);geo=(ll-origin)*factor
landmarks=np.array([geo[5],geo[34],geo[57],geo[78]])
pixels=np.array([[76,708],[449,415],[812,759],[480,1016]])
a=landmarks-landmarks.mean(0);b=pixels-pixels.mean(0)
u,s,vt=np.linalg.svd(a.T@b);rotation=u@vt;scale=s.sum()/(a*a).sum();translation=pixels.mean(0)-landmarks.mean(0)@rotation*scale
residual=np.sqrt(np.mean(np.sum((landmarks@rotation*scale+translation-pixels)**2,axis=1)))
assert residual<5, f'Primary map/GIS layout mismatch: {residual}px'
apices=np.array([[76,707],[144,690],[149,510],[448,416],[538,626],[649,581],[812,758],[773,822],[475,833],[529,904],[481,1014],[318,886],[225,911],[136,846],[711,756]])
estimated=(apices-translation)@rotation.T/scale
segments=geo[1:]-geo[:-1];lens=np.linalg.norm(segments,axis=1);distance=np.r_[0,np.cumsum(lens)]
corners=[]
for i,p in enumerate(estimated):
    fraction=np.clip(np.sum((p-geo[:-1])*segments,axis=1)/(lens*lens),0,1)
    candidates=geo[:-1]+fraction[:,None]*segments
    error=np.linalg.norm(candidates-p,axis=1);j=error.argmin()
    coordinate=(origin+candidates[j]/factor).tolist()
    corners.append(dict(number=i+1,coordinate=coordinate,snapErrorMetres=float(error[j]),fraction=float((distance[j]+fraction[j]*lens[j])/distance[-1])))
output=dict(corners=corners,rmsPixels=float(residual),maxSnapMetres=max(c['snapErrorMetres'] for c in corners),
    sourceUrl='https://cdn.jsdelivr.net/gh/TracingInsights/DDocs@86676c9e4b5c5f5ef9585b1cf05a45e14a7dafa6/documents/2026/bahrain-grand-prix/competition-notes-circuit-map-pit-lane-drawing-emergency-exits-map-and-red-zone.pdf',
    method='FIA 2026 Doc7 p2; four manually matched landmarks, similarity fit and geographic centerline projection; factual corner positions only')
(root/'research/sepang-corners.json').write_text(json.dumps(output,indent=2),encoding='utf-8')
print('Sepang primary map fit RMS pixels',residual,'max corner snap m',output['maxSnapMetres'])
