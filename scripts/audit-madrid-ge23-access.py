"""Offline annual access audit; hospitality does not imply a public GE23 ticket."""
import base64
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT/'research/season-review/madrid2026'
read = lambda p: json.loads(p.read_text('utf8'))

class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip, self.parts = 0, []
    def handle_starttag(self,tag,attrs):
        if tag in ['script','style']:self.skip += 1
    def handle_endtag(self,tag):
        if tag in ['script','style']:self.skip = max(0,self.skip-1)
    def handle_data(self,data):
        if not self.skip:self.parts.append(data)

def body(path):
    parser = Text()
    parser.feed(path.read_text('utf8'))
    return ' '.join(' '.join(parser.parts).split())

historic = read(RAW/'ignition-2026-fetch.json')
product_url = 'https://hospitality.madring.com/en/f1/ignition-club/'
assert historic['cdx']['original']==product_url and historic['cdx']['timestamp'].startswith('2026')
assert historic['url']==f"https://web.archive.org/web/{historic['cdx']['timestamp']}id_/{product_url}"
raw = (RAW/'ignition-2026.html').read_bytes()
assert hashlib.sha256(raw).hexdigest()==historic['sha256']
assert base64.b32encode(hashlib.sha1(raw).digest()).decode().rstrip('=')==historic['cdx']['digest']
old_text = body(RAW/'ignition-2026.html')
assert 'Ignition Club' in old_text and '2026' in old_text and '2027' not in old_text
assert 'reserved grandstand' in old_text.lower() and 'not pre-assigned' in old_text.lower()
live = read(RAW/'ignition-fetch.json')
assert live['url']==product_url and live['responseUrl']==product_url
assert hashlib.sha256((RAW/'ignition-current.html').read_bytes()).hexdigest()==live['sha256']
live_text = body(RAW/'ignition-current.html')
assert '2027' in live_text and '2026' not in live_text
overview = read(ROOT/'src/circuits/season-review/madrid-withdrawn-public-models.json')
assert hashlib.sha256((RAW/'map-xl.webp').read_bytes()).hexdigest()==overview['sourceSha256']
runtime = read(ROOT/'src/circuits/generated/madrid.json')
zone = next(z for z in runtime['spectatorZones'] if z['zoneId']=='t13t14')
assert zone['availability']!='available', 'Unverified ordinary access must not be advertised as available'
report = {
    'circuitId':'madrid','season':2026,'checkedAt':'2026-10-27','inventoryComplete':False,
    'scope':'Annual access classification only; no stand footprint or simulation accepted.',
    'sources':{
        'venueMap':{'url':overview['sourceUrl'],'sha256':overview['sourceSha256'],'label':'GE23','hospitalityMarker':7,'markerName':'Ignition Club'},
        'historicProduct':{'url':historic['url'],'sha256':historic['sha256'],'timestamp':historic['cdx']['timestamp'],'cdxDigestMatchesReplay':True,
            'facts':'The 2026 Ignition Club package includes reserved grandstand seating; guests choose seats subject to availability. The page does not identify GE23 by code.'},
        'liveProduct':{'url':live['responseUrl'],'sha256':live['sha256'],'year':2027,'limitation':'Current-year terms cannot establish 2026 ordinary admission.'}},
    'areas':[{'zoneId':'t13t14','mapLabel':'GE23','relatedHospitalityProduct':'Ignition Club',
        'hospitalityProductConfirmed2026':True,'ordinaryAccessVerified':False,'wholeBankHospitalityExclusiveVerified':False,
        'modelGeometryAccepted':False,'recordedGeometryIssues':zone.get('geometryReview',{}).get('issues',[]),
        'nextAction':'Obtain an official 2026 GE23 ticket/access crosswalk. Do not assume the whole bank is ordinary public seating or hospitality-only; separately reconstruct its footprint before opening.'}]}
output = ROOT/'src/circuits/season-review/madrid-public-access-review.json'
output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print(json.dumps({'historicProductAuthenticated':True,'livePageYear':2027,'ordinaryGE23AccessVerified':False,'runtimeChanged':False}))
