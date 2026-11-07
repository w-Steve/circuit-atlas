"""Replay verified OSM ground-level fences; source XML is research-only.
Run with --extract after refreshing seven way/full records, then without it.
"""
import json,hashlib,sys,xml.etree.ElementTree as E
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
config=ROOT/'src/circuits/europe/monza-barriers.json'
ids=[243090140,243090142,243090147,243090149,243215081,1409146330,1409146336]
if '--extract' in sys.argv:
 barriers=[];records=[]
 for i in ids:
  raw=(ROOT/f'research/season-review/monza-barriers/{i}.xml').read_bytes();r=E.fromstring(raw)
  n={x.attrib['id']:[float(x.attrib['lon']),float(x.attrib['lat'])] for x in r.findall('node')};w=r.find('way')
  tags={t.attrib['k']:t.attrib['v'] for t in w.findall('tag')}
  assert w.attrib['id']==str(i) and tags.get('height')=='3' and tags.get('fence_type')=='chain_link' and tags.get('layer','0')=='0'
  source={'url':f'https://www.openstreetmap.org/way/{i}','checkedAt':'2026-10-25','method':'extracted','confidence':'medium','notes':f'OSM way {i} v{w.attrib["version"]}, edited {w.attrib["timestamp"]}; explicit chain_link height=3m, ground layer. Position and height are community records, not a certified 2026 facility survey. Ground follows current regional DTM. Wire cell size and post spacing/radius are schematic, not measured.'}
  barriers.append({'id':f'osm-way-{i}','kind':'chain-link','coordinates':[n[x.attrib['ref']] for x in w.findall('nd')],'heightMetres':3,'source':source})
  records.append({'wayId':i,'version':int(w.attrib['version']),'timestamp':w.attrib['timestamp'],'nodeIds':[int(x.attrib['ref']) for x in w.findall('nd')],'fullResponseSha256':hashlib.sha256(raw).hexdigest(),'tags':tags})
 config.write_text(json.dumps({'circuitId':'monza','barriers':barriers,'records':records,'limitations':'Seven explicit ground-level chain-link records only. Excludes layer=-1 long fence, layer=1 wall, parking chains and unknown heights. No claim of complete 2026 barriers, vegetation or surveyed base levels. Source polyline coordinates retained without clipping, offsets or visibility-based adjustment.'},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
p=ROOT/'src/circuits/facilities/monza.json';data=json.loads(p.read_text('utf8'));data['barriers']=json.loads(config.read_text('utf8'))['barriers'];p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
