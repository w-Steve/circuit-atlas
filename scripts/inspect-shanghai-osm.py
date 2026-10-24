import json, pathlib,xml.etree.ElementTree as E,math
root=pathlib.Path(__file__).resolve().parents[1]
r=E.parse(root/'research/shanghai-osm.xml').getroot()
nodes={n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])] for n in r.findall('node')}
ways=[]
for w in r.findall('way'):
    tags={t.attrib['k']:t.attrib['v'] for t in w.findall('tag')}
    if tags.get('building')=='grandstand' or tags.get('landuse') in ['grass','meadow']:
        points=[nodes[n.attrib['ref']] for n in w.findall('nd') if n.attrib['ref'] in nodes]
        ways.append(dict(id=w.attrib['id'],tags=tags,points=points))
(root/'research/shanghai-osm-zones.json').write_text(json.dumps(ways,ensure_ascii=False,indent=2),encoding='utf8')
track=json.loads((root/'src/circuits/generated/shanghai.json').read_text(encoding='utf8'))['trackGeometry']['coordinates']
cos=math.cos(track[0][1]*math.pi/180)
def world(p):return [(p[0]-track[0][0])*111320*cos,-(p[1]-track[0][1])*111320]
t=[world(p) for p in track];west=min(p[0] for p in t)-250;north=min(p[1] for p in t)-250
width=max(p[0] for p in t)-west+250;height=max(p[1] for p in t)-north+250
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{west} {north} {width} {height}"><rect x="{west}" y="{north}" width="{width}" height="{height}" fill="#eee"/>']
svg.append('<polyline points="'+' '.join(f'{p[0]},{p[1]}' for p in t)+'" fill="none" stroke="#222" stroke-width="15"/>')
for w in ways:
    p=[world(c) for c in w['points']]
    if not p:continue
    color='#e86050' if w['tags'].get('building')=='grandstand' else '#79b67a'
    svg.append('<polygon points="'+' '.join(f'{v[0]},{v[1]}' for v in p)+f'" fill="{color}" fill-opacity=".6" stroke="{color}"/>')
    if w['tags'].get('building')=='grandstand' or w['id'] in ['485553709','485553713','485553716','1270619365']:
        x=sum(v[0] for v in p)/len(p);y=sum(v[1] for v in p)/len(p)
        svg.append(f'<text x="{x}" y="{y}" font-size="22">{w["tags"].get("name:en",w["id"])}</text>')
for c in json.loads((root/'src/circuits/generated/shanghai.json').read_text(encoding='utf8'))['corners']:
    x,y=world(c['coordinate']);svg.append(f'<text x="{x}" y="{y}" font-size="30" fill="#1647a8">T{c["number"]}</text>')
svg.append('</svg>');(root/'research/shanghai-osm-review.svg').write_text(''.join(svg),encoding='utf8')
print([(w['id'],w['tags'].get('name:en'),len(w['points'])) for w in ways if w['tags'].get('building')=='grandstand'])
