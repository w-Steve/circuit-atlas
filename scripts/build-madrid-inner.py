"""Extract final2026 disconnected inner GD ribbons; no geographic/runtime writes."""
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np
from shapely.geometry import Polygon, Point, box
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
raw=ROOT/'research/season-review/madrid2026/map-xl.webp'
sha=hashlib.sha256(raw.read_bytes()).hexdigest()
assert sha=='99ac1e3d5f822f0b650da0f727956c7f8c7d64c9616327f4cfc0cedebacaf241'
image=cv2.imread(str(raw));hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV)
mask=((hsv[:,:,0]>115)&(hsv[:,:,0]<160)&(hsv[:,:,1]>45)&(hsv[:,:,2]>100)).astype('uint8')
_,labels,stats,_=cv2.connectedComponentsWithStats(mask)
arcs=[]
shapes=[]
for name,bounds in [('GD1–GD3',[1019,186,46,13]),('GD4–GD7',[1066,198,20,43]),('GD8–GD10',[1059,243,24,32]),('GD11',[1024,270,37,16])]:
    matches=[i for i,st in enumerate(stats) if st[:4].tolist()==bounds];assert len(matches)==1
    component=(labels==matches[0]).astype('uint8')
    yy,xx=np.where(component)
    pixels=unary_union([box(float(x)-.5,float(y)-.5,float(x)+.5,float(y)+.5) for x,y in zip(xx,yy)])
    parts=[pixels] if pixels.geom_type=='Polygon' else list(pixels.geoms)
    # Pixel-cell union preserves thin necks and diagonal contacts without invalid center contours.
    shape=unary_union([Polygon(part.exterior) for part in parts])
    assert shape.is_valid and shape.area>0
    parts=[shape] if shape.geom_type=='Polygon' else list(shape.geoms)
    assert not shape.covers(Point(1048,231))
    assert all(shape.intersection(other).area==0 for other in shapes)
    shapes.append(shape)
    arcs.append({'label':name,'componentBounds':bounds,'purplePixelCount':int(stats[matches[0],4]),
                 'sourceContoursPixels':[list(part.exterior.coords) for part in parts],
                 'outerContourAreaPixels2':shape.area})
report={'circuitId':'madrid','season':2026,
 'sourceUrl':'https://www.madring.com/img/xl/mapa-madring/mapa_web_11_8_26_ing.webp',
 'sourceSha256':sha,'checkedAt':'2026-10-27','arcs':arcs,
 'extraction':{'colourSpace':'OpenCV HSV','hueOpenInterval':[115,160],'minimumSaturationExclusive':45,'minimumValueExclusive':100,'contours':'pixel-cell union exteriors; interior text holes ignored; thin/diagonal contacts retained; no morphological closing or manual end caps'},
 'geometryAvailable':False,'inventoryComplete':False,
 'limits':'Printed raster silhouette only, not surveyed boundaries, individual ticket entitlements, access rights or height. Edge-touching text/icons distort outline; must review occluded edges before geographic modeling.',
 'failedPrototype':'Manual source polylines drifted into white/central facilities. Normal-cut registration of GD11 produced disconnected spans; rejected, no runtime migration.',
 'nextAction':'Resolve GD11 text/icon occlusions and source-to-GIS mapping of all four disjoint arcs; then shared mesh/picking, annual admission and scene acceptance.'}
p=ROOT/'src/circuits/europe/madrid-inner-contours-2026.json'
p.write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print(json.dumps([{'label':a['label'],'purplePixelCount':a['purplePixelCount'],'outerContourAreaPixels2':a['outerContourAreaPixels2']} for a in arcs]))
