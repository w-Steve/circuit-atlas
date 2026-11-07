"""Authenticate 2026 Mirador facts; reject old diagrams as GD11 boundaries."""
import base64, hashlib, json
from html.parser import HTMLParser
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'research/season-review/madrid2026'
read=lambda p:json.loads(p.read_text('utf8'))

class Text(HTMLParser):
    def __init__(self):super().__init__();self.parts=[];self.skip=0
    def handle_starttag(self,t,a):
        if t in ['script','style']:self.skip+=1
    def handle_endtag(self,t):
        if t in ['script','style']:self.skip=max(0,self.skip-1)
    def handle_data(self,s):
        if not self.skip:self.parts.append(s)

def verified(name,sha):
    raw=(RAW/name).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==sha, f'Changed evidence {name}'
    fetch=read(RAW/(name+'.fetch.json'))
    assert fetch['sha256']==sha
    return raw,fetch

raw,historic=verified('mirador-2026.html','22367048803611cc603b1d939c756e6a60608b61b9b2c643cb901cdbe812c374')
url='https://hospitality.madring.com/en/f1/el-mirador/'
cdx=read(RAW/'mirador-cdx-2026.json');entry=next(dict(zip(cdx[0],r)) for r in cdx[1:] if r[1]=='20260521110434')
assert entry['original']==url and historic['url']==f"https://web.archive.org/web/{entry['timestamp']}id_/{url}"
assert historic['finalUrl']==historic['url'] and historic['status']==200
assert base64.b32encode(hashlib.sha1(raw).digest()).decode()==entry['digest']
t=Text();t.feed(raw.decode('utf8'));body=' '.join(' '.join(t.parts).split())
assert '2026' in body and '2027' not in body and 'GD11' not in body
assert 'reserved El Mirador grandstand' in body and 'not pre-assigned' in body
assert 'dedicated hospitality grandstand seating' in body
svg,archived=verified('peraltada-2026.svg','dd48e19fe0edfad4c9019caf642369d3f92c5082fac33c37070dcefb62c4e49e')
index=read(RAW/'peraltada-cdx-2026.json');row=dict(zip(index[0],index[1]))
assert row['timestamp']=='20260607132314' and row['mimetype']=='image/svg+xml'
assert archived['url']==f"https://web.archive.org/web/{row['timestamp']}id_/{row['original']}"
assert ET.fromstring(svg).tag.endswith('svg')
assert base64.b32encode(hashlib.sha1(svg).digest()).decode()!=row['digest']
_,live=verified('peraltada-current.svg','7a4ec215096d5adad9003d15baf1530d894b853b3d9b2d0e09c8bb52b2eae079')
assert live['finalUrl'].endswith('/error404') and 'text/html' in live['contentType']
_,concept=verified('monumental-detail.webp','d4e70231f0077e032173b58b7fcdf47b46f9b701b7d87a56b5666ecadd5129c0')
runtime=read(ROOT/'src/circuits/generated/madrid.json')
assert next(z for z in runtime['spectatorZones'] if z['zoneId']=='monumental-12')['availability']!='available'
report={'circuitId':'madrid','season':2026,'checkedAt':'2026-10-27','inventoryComplete':False,
 'scope':'GD11 annual access and boundary-source review only; no geometry or admission accepted.',
 'sources':{
  'historicMirador':{'url':historic['url'],'sha256':historic['sha256'],'timestamp':entry['timestamp'],'cdxDigestMatchesReplay':True,
   'facts':'2026 El Mirador includes dedicated hospitality seating. Reserved seating is not pre-assigned and guests choose subject to availability. No GD11 code or entire-bank access crosswalk.'},
  'archivedPeraltadaSvg':{'url':archived['url'],'sha256':archived['sha256'],'cdxDigestMatchesReplay':False,
   'visualReview':'Old ticket-section numbers 9/9A/10/11/12 and arrows; no individual GD footprint. Rejected as authenticated annual bank geometry.'},
  'currentPeraltadaSvg':{'url':live['url'],'finalUrl':live['finalUrl'],'sha256':live['sha256'],'usable':False,'reason':'HTTP200 soft404 HTML, not SVG'},
  'conceptImage':{'url':concept['url'],'sha256':concept['sha256'],'usableForMetricGeometry':False,
   'visualReview':'Image watermark states indicative and subject to change. No GD11 label, survey scale, date or as-built section.'}},
 'areas':[{'zoneId':'monumental-12','mapLabel':'GD11','relatedHospitalityProduct':'El Mirador',
   'hospitalityProductConfirmed2026':True,'ordinaryAccessVerified':False,'wholeBankHospitalityExclusiveVerified':False,
   'modelGeometryAccepted':False,'recordedGeometryIssues':['GD11 icon/text edge continuation up to approximately8px in isolated candidate; no unobstructed final2026 boundary.'],
   'nextAction':'Obtain final2026 GD11-to-ticket/admission crosswalk and unobstructed seat boundary. Do not classify the whole bank as ordinary or hospitality-only from the nearby Mirador symbol.'}]}
(ROOT/'src/circuits/season-review/madrid-inner-public-access-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print('2026 Mirador authenticated; GD11 ordinary access unverified; concept/SVG rejected as metric boundary; runtime unchanged')
