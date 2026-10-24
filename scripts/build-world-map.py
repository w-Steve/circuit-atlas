"""Rebuild the offline world overview and its small calendar/anchor metadata.
Normal npm builds use committed assets; this opt-in tool is not run by npm.
"""
import argparse,json
from pathlib import Path
from shapely.geometry import shape,box
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
URL='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'
# Official effective 2026 calendar snapshot, checked 2026-10-23. Keeping dates
# keyed by circuit avoids accidentally applying a weekend to a changed round.
WEEKENDS={
'melbourne':('03-06','03-08'),'shanghai':('03-13','03-15'),'suzuka':('03-27','03-29'),
'miami':('05-01','05-03'),'montreal':('05-22','05-24'),'monaco':('06-05','06-07'),
'barcelona':('06-12','06-14'),'spielberg':('06-26','06-28'),'silverstone':('07-03','07-05'),
'spa':('07-17','07-19'),'hungaroring':('07-24','07-26'),'zandvoort':('08-21','08-23'),
'monza':('09-04','09-06'),'madrid':('09-11','09-13'),'baku':('09-24','09-26'),
'sepang':('10-02','10-04'),'singapore':('10-09','10-11'),'austin':('10-23','10-25'),
'mexico':('10-30','11-01'),'interlagos':('11-06','11-08'),'las-vegas':('11-19','11-21'),
'lusail':('11-27','11-29'),'yas-marina':('12-04','12-06')}
def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--land',type=Path,help='Optional local Natural Earth GeoJSON, for offline regeneration')
 parser.add_argument('--proxy',help='Optional per-request proxy, e.g. http://127.0.0.1:7890')
 args=parser.parse_args()
 if args.land:raw=json.loads(args.land.read_text(encoding='utf8'))
 else:
  import requests
  response=requests.get(URL,proxies={'https':args.proxy} if args.proxy else None,timeout=60);response.raise_for_status();raw=response.json()
 land=unary_union([shape(f['geometry']) for f in raw['features']]).intersection(box(-180,-60,180,82)).simplify(.16,preserve_topology=True)
 paths=[]
 for polygon in land.geoms:
  paths.append(''.join('M'+'L'.join(f'{(lon+180)*1200/360:.1f},{(82-lat)*1200/360:.1f}' for lon,lat in ring.coords)+'Z' for ring in [polygon.exterior,*polygon.interiors]))
 (ROOT/'src/assets/world-land.json').write_text(json.dumps(paths,separators=(',',':')),encoding='utf8')
 summaries=json.loads((ROOT/'src/circuits/generated/summaries.json').read_text(encoding='utf8'))
 assert set(WEEKENDS)=={c['circuitId'] for c in summaries},'Calendar changed; verify the official source before updating dates'
 metadata={}
 for c in summaries:
  cid=c['circuitId'];data=json.loads((ROOT/f'src/circuits/generated/{cid}.json').read_text(encoding='utf8'));start,end=WEEKENDS[cid]
  metadata[cid]={'coordinate':data['trackGeometry']['coordinates'][0],'start':'2026-'+start,'end':'2026-'+end}
 (ROOT/'src/circuits/season2026.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf8')
 print(f'{len(paths)} land polygons; {len(metadata)} unique circuit anchors/weekends')
if __name__=='__main__':main()
