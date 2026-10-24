import json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
requests=[]
for summary in json.loads((root/'src/circuits/generated/summaries.json').read_text(encoding='utf-8')):
    circuit=summary['circuitId']
    d=json.loads((root/f'src/circuits/generated/{circuit}.json').read_text(encoding='utf-8'))
    coords=d['trackGeometry']['coordinates']
    west,east=min(p[0] for p in coords)-.002,max(p[0] for p in coords)+.002
    south,north=min(p[1] for p in coords)-.002,max(p[1] for p in coords)+.002
    n=17
    locations=[f'{south+(north-south)*r/(n-1):.7f},{west+(east-west)*c/(n-1):.7f}' for r in range(n) for c in range(n)]
    for i in range(0,len(locations),99):
        requests.append(dict(id=circuit,part=i//99,url='https://api.opentopodata.org/v1/srtm90m?interpolation=bilinear&locations='+'|'.join(locations[i:i+99]),bounds=[west,south,east,north],size=n))
(root/'research/elevation-requests.json').write_text(json.dumps(requests),encoding='utf-8')
