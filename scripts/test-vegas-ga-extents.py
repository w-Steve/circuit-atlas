"""Independent source-space checks for expanded GA sectors and old sample retention."""
import json,math,xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
d=read('src/circuits/generated/las-vegas.json');o=np.array(d['trackGeometry']['coordinates'][0][:2]);sc=np.array([111320*math.cos(math.radians(o[1])),111320])
xy=lambda p:(np.array(p)[:2]-o)*sc
poly=lambda b:Polygon([xy(p) for p in b])
r=ET.parse(ROOT/'research/americas/las-vegas-osm.xml').getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in r.findall('node')};w=next(w for w in r.findall('way') if w.get('id')=='976405284');sphere=poly([nodes[n.get('ref')] for n in w.findall('nd')])
f=read('src/circuits/facilities/las-vegas.json');obstacles=[sphere,LineString([xy(p) for p in d['trackGeometry']['coordinates']]).buffer(d['trackGeometry']['widthMetres']/2)]+[poly(s['boundary']) for z in d['spectatorZones'] if z['kind']=='grandstand' for s in z['surfaces']]+[poly(b['boundary']) for b in f['buildings']]+[LineString([xy(p) for p in l['coordinates']]).buffer(l['widthMetres']/2) for l in f['pitLanes']]
for file in ['las-vegas-tmobile-ga-2026.json','las-vegas-flamingo-ga-2026.json']:
 r=read('src/circuits/americas/'+file);zone=r['zones'][0];current=next(z for z in d['spectatorZones'] if z['zoneId']==zone['zoneId']);assert current==zone
 p=unary_union([poly(s['boundary']) for s in zone['surfaces']]);old=poly(r['beforeZones'][0]['boundary'])
 assert p.area>old.area*3 and old.difference(p).area<.1
 assert all(p.intersection(q).area<.1 for q in obstacles)
 assert all(s['eyeHeight']==1.65 and s['rise']==0 and s['rows']==0 for s in zone['surfaces'])
 print(zone['zoneId'],round(p.area),'m2; initial sample retained; no road/stand/facility/Sphere intrusion')
