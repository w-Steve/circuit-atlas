"""Fetch OSM grandstand footprints, retaining raw tags for manual 2026 matching."""
import concurrent.futures,json,subprocess,sys,xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parents[1]
args=sys.argv[1:];region='americas' if args and args[0]=='americas' else ('asia' if args else 'europe')
if region=='americas':args=args[1:] or ['miami','montreal','austin','mexico','interlagos','las-vegas']
ids=args or ['monaco','barcelona','spielberg','silverstone','spa','hungaroring','zandvoort','monza','madrid']
out=root/f'research/{region}';out.mkdir(parents=True,exist_ok=True)
def fetch(id):
 target=root/f'src/circuits/{region}/osm'/(id+'-osm.json');target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists(): return id,'cached'
 data=json.loads((root/f'src/circuits/generated/{id}.json').read_text(encoding='utf8'))
 coords=data['trackGeometry']['coordinates'];xs=[p[0] for p in coords];ys=[p[1] for p in coords]
 west,south,east,north=min(xs)-.003,min(ys)-.002,max(xs)+.003,max(ys)+.002
 url=f'https://api.openstreetmap.org/api/0.6/map?bbox={west},{south},{east},{north}'
 raw=out/(id+'-osm.xml')
 result=subprocess.run(['curl.exe','--proxy','http://127.0.0.1:7890','--fail','--silent','--show-error','--max-time','90','--retry','1',url,'--output',str(raw)],capture_output=True,text=True)
 if result.returncode:return id,result.stderr
 xml=ET.parse(raw).getroot()
 nodes={n.get('id'):{'lon':float(n.get('lon')),'lat':float(n.get('lat'))} for n in xml.findall('node')}
 elements=[]
 for w in xml.findall('way'):
  tags={t.get('k'):t.get('v') for t in w.findall('tag')}
  if tags.get('building')=='grandstand' or tags.get('leisure') in ['bleachers','grandstand']:
   elements.append({'id':int(w.get('id')),'tags':tags,'geometry':[nodes[n.get('ref')] for n in w.findall('nd') if n.get('ref') in nodes]})
 target.write_text(json.dumps({'elements':elements},ensure_ascii=False),encoding='utf8')
 return id,[(e['id'],e['tags'].get('name',''),e['tags'].get('ref','')) for e in elements]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for result in pool.map(fetch,ids):print(ascii(result),flush=True)

missing=[id for id in ids if not (root/f'src/circuits/{region}/osm'/(id+'-osm.json')).exists()]
if missing:raise SystemExit('Missing OSM source packages: '+', '.join(missing))
