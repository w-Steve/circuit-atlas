"""Extract factual FIA timing values; retain diagram picks, never FIA artwork.
PDFs are local research only. Result is sufficient for static, offline replay.
Symbol picks identify approximate diagram locations, not surveyed coordinates.
"""
import json,re,hashlib,collections
from pathlib import Path
import fitz
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'research/season-review/timing';OUT=ROOT/'src/circuits/timing';OUT.mkdir(exist_ok=True)
# Approximate symbol centres in the 595 x 842 diagram preview, independently
# inspected against the retained FIA map. Projection removes lateral flag offset.
picks={
 'austin':([255,704],[178,664]),'baku':([437,258],[422,279]),
 'barcelona':([379,405],[410,367]),'hungaroring':([218,651],[235,660]),
 'interlagos':([236,536],[266,526]),'las-vegas':([382,720],[344,713]),
 'lusail':([160,523],[188,598]),'madrid':([357,694],[405,656]),
 'melbourne':([296,640],[257,602]),'mexico':([136,578],[115,668]),
 'miami':([279,434],[224,443]),'monaco':([87,545],[104,535]),
 'montreal':([417,587],[430,608]),'monza':([132,530],[134,593]),
 'sepang':([276,461],[316,462]),'shanghai':([280,572],[331,566]),
 'silverstone':([137,520],[118,552]),'singapore':([509,274],[494,344]),
 'spa':([224,245],[258,296]),'spielberg':([377,537],[411,532]),
 'suzuka':([461,535],[455,500]),'yas-marina':([357,504],[322,468]),
 'zandvoort':([127,392],[95,419]),
}
index=SRC/'sources.json'
# Public checkouts retain provenance in each packet; raw PDFs stay local.
rows=json.loads(index.read_text('utf8')) if index.exists() else [
 {'circuitId':d['circuitId'],'season':d['sourceSeason'],'url':d['source']['url']}
 for d in (json.loads(p.read_text('utf8')) for p in sorted(OUT.glob('*.json')))
]
if not rows:raise ValueError('No timing source packets or local index')
for row in rows:
 cid=row['circuitId'];raw=(SRC/f'{cid}.pdf').read_bytes();doc=fitz.open(stream=raw,filetype='pdf')
 if not re.search(rf'\b{row["season"]}\b',doc[0].get_text()):raise ValueError(f'{cid}: document year mismatch')
 page=next(p for p in doc if 'SECTOR 1' in p.get_text() or 'Sector 1' in p.get_text())
 data=json.loads((ROOT/f'src/circuits/generated/{cid}.json').read_text('utf8'))
 spans=[s for b in page.get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans']]
 groups=collections.defaultdict(list)
 for s in spans:
  text=s['text'].strip()
  if s['color'] not in [255,16383] or not text.isdigit() or not 1<=int(text)<=data['cornerCount']:continue
  groups[(s['font'],round(s['size'],1),s['color'])].append(s)
 group=max(groups.values(),key=lambda ss:len(set(s['text'].strip() for s in ss)))
 labels={int(s['text'].strip()):[(s['bbox'][0]+s['bbox'][2])/2,(s['bbox'][1]+s['bbox'][3])/2] for s in group}
 if len(labels)<data['cornerCount']-1:raise ValueError(f'{cid}: missing corner labels; inspect source')
 text=page.get_text(sort=True)
 lengths=[re.search(rf'SECTOR\s+{i}\s*-\s*([\d.]+)km',text) for i in [1,2,3]]
 lengths=[round(float(m[1])*1000) for m in lengths] if all(lengths) else None
 splits=[]
 for i in [1,2]:
  m=re.search(rf'INTERMEDIATE\s+{i}\s*\[S{i}\]\s*-\s*(?:(\d+)m\s+(before|after)|(?:Entry|Apex))\s+T(\d+)',text,re.I)
  if not m:m=re.search(rf'Sector\s+{i}\s*[\[(]?(\d+)m\s+(before|after)\s+Turn\s*(\d+)',text,re.I)
  if not m:
   # Legacy diagrams place the description after the S1/S2 key.
   m=re.search(rf'Sector\s*{i}[^\n]*?(\d+)m\s+(before|after)\s+T(?:urn\s*)?(\d+)',text,re.I)
  if not m:raise ValueError(f'{cid}: no independent S{i} anchor')
  anchor={'corner':int(m[3]),'offsetMetres':int(m[1] or 0)*(-1 if m[2] and m[2].lower()=='before' else 1)}
  if re.search(r'\bEntry\b',m[0],re.I):
   # Entry is not the apex. Use the actual S-label from the FIA drawing rather
   # than silently placing an entry loop at the model's corner apex.
   markers=[s for s in spans if s['text'].strip()==f'S{i}' and s['size']>8]
   if not markers:raise ValueError(f'{cid}: missing entry-loop diagram label')
   marker=max(markers,key=lambda s:s['size']);box=marker['bbox']
   anchor.update({'reference':'entry','diagramPoint':[(box[0]+box[2])/2,(box[1]+box[3])/2]})
  splits.append(anchor)
 scale=min(595/page.rect.width,842/page.rect.height)
 marks={key:[round(v/scale,3) for v in point] for key,point in zip(['start','control'],picks[cid])}
 result={'circuitId':cid,'sourceSeason':row['season'],'pdfSha256':hashlib.sha256(raw).hexdigest(),'mapPage':page.number+1,
  'mapSize':[page.rect.width,page.rect.height],'cornerLabels':[{'number':n,'point':p} for n,p in sorted(labels.items())],
  'diagramMarks':marks,'sectorLengthsMetres':lengths,'splitAnchors':splits,
  'source':{'url':row['url'],'checkedAt':'2026-10-24','method':'extracted','confidence':'low',
   'notes':'FIA sector distances and intermediate corner offsets are published facts. Start/control flag diagram picks and GIS registration are approximate, not surveyed line coordinates. '+('2025 reference for a 2026 venue; recheck when 2026 event notes are available.' if row['season']!=2026 else '2026 event document.')}}
 (OUT/f'{cid}.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print(cid,len(labels),lengths,splits)
