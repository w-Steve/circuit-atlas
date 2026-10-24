"""2026 publicly ticketed areas only. OSM plan footprints, estimated slopes.
Historical L and VIP club products are intentionally not general spectator zones.
"""
import json,math,pathlib,numpy as np
root=pathlib.Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text(encoding='utf8'))
ways={w['id']:w for w in read('research/shanghai-osm-zones.json')}
track=read('src/circuits/generated/shanghai.json');corners={c['number']:np.array(c['coordinate']) for c in track['corners']}
origin=np.array(track['trackGeometry']['coordinates'][0]);factor=np.array([111320*math.cos(math.radians(origin[1])),-111320])
opening='https://www.shanghai.gov.cn/nw17239/20251209/b2b6c8cdfe014ce181304a4459664eb8.html'
venue='https://english.shanghai.gov.cn/en-SportsEvents/20260311/933bcc13c7c44363a04a036b4888a7de.html'
def source(url,method,confidence,notes):return dict(url=url,checkedAt='2026-10-23',method=method,confidence=confidence,notes=notes)
def depth(points):
    p=(np.array(points)-origin)*factor;a=p-p.mean(0);values,vectors=np.linalg.eigh(a.T@a);return float(np.ptp(a@vectors[:,0]))
configs=[
    ('a','A 主看台','grandstand',['107371135'],3,10,'主直道、发车区与维修通道。'),
    ('b','B 看台','grandstand',['156341844','156341848','156341851'],2.5,13,'一至三号弯，观察减速入弯与螺旋弯。'),
    ('e','E 看台','grandstand',[str(i) for i in [156974489,156974496,156974483,156974497,156974491,156974506,156974493,156974485,156974487,156974499,156974500]],2,14,'十一至十三号组合弯，2026 年重新开放。'),
    ('h','H 看台','grandstand',['1372223261'],2,9,'长直道末端与十四号发夹弯外侧。'),
    ('k','K 看台','grandstand',['1372223262'],2.5,11,'十四至十五号弯内侧，面向制动与出弯。'),
    ('c','C 草地','grass',[],.6,3.2,'五至六号弯外侧，开放式草坡视野。'),
    ('f','F 草地','grass',['485553716'],.5,2,'长直道中段，感受高速经过。'),
    ('j','J 草地','grass',['485553709'],.8,4.5,'十四号发夹弯外侧的草地观赛区域。'),
]
zones=[]
for zoneId,name,kind,ids,base,rise,description in configs:
    boundaries=[ways[i]['points'] for i in ids]
    if zoneId=='c':
        p=(corners[5]-origin)*factor;q=(corners[6]-origin)*factor;inside=(corners[7]-origin)*factor
        tangent=(q-p)/np.linalg.norm(q-p);normal=np.array([-tangent[1],tangent[0]])
        if np.dot(inside-p,normal)>0:normal=-normal
        center=p*.65+q*.35+normal*55
        poly=[(origin+(center+tangent*u+normal*v)/factor).tolist() for u,v in [(-155,-18),(155,-18),(155,18),(-155,18),(-155,-18)]]
        boundaries=[poly]
    surfaces=[dict(surfaceId=f'{zoneId}-{i+1}',boundary=b,baseHeight=base,rise=rise,eyeHeight=1.2,rows=round(rise/.55) if kind=='grandstand' else 0) for i,b in enumerate(boundaries)]
    provenance=source('https://www.openstreetmap.org/way/'+ids[0] if ids else venue,'extracted' if ids else 'estimated','medium' if ids else 'low',
        'OSM平面边界；'+','.join('way/'+i for i in ids)+'；高度与坡度另为估算，非测绘' if ids else '根据2026正式场地图相对于T5–T6的位置估计边界，尚无具名地理多边形；位置与范围低精度')
    zones.append(dict(zoneId=zoneId,name=name,kind=kind,availability='available',boundary=boundaries[0],
        surface=dict(baseHeight=base,rise=rise,depth=round(depth(boundaries[0]),2),eyeHeight=1.2),surfaces=surfaces,
        source=provenance,openingSource=source(opening,'published','high','2026普通观众售票区域；不包含独立贵宾俱乐部'),
        surfaceSource=source(venue,'estimated','low','阶梯/草坡高度及坡度为可配置估计；不是实测高程'),description=description))
(root/'src/circuits/shanghai/zones.json').write_text(json.dumps(zones,ensure_ascii=False,indent=2),encoding='utf8')
print([(z['zoneId'],len(z['surfaces'])) for z in zones])
