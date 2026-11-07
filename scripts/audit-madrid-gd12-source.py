"""Audit cached GD12 source leads offline; never synthesize a runtime footprint."""
import base64
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT/'research/season-review/madrid2026'
read = lambda p: json.loads(p.read_text('utf8'))
html_bytes = (RAW/'tickets-2026.html').read_bytes()
capture = read(RAW/'tickets-fetch.json')
assert hashlib.sha256(html_bytes).hexdigest() == capture['sha256']
text = html_bytes.decode('utf8')
assert 'Section 8 Silver Plus:' in text and 'braking zone at turn 13' in text
asset_path = '/img/mapa-curvas-enlazadas/mapa-_5.svg'
assert asset_path in text
asset = read(RAW/'curvas-fetch.json')
assert asset['url'] == 'https://www.madring.com'+asset_path
# A 200 response from the publisher is not enough to accept a geometry asset.
assert asset['contentType'].startswith('text/html') and asset['responseUrl'].endswith('/error404')
cdx = read(RAW/'curvas-svg-cdx.json')
assert cdx == [], 'Inspect newly available archive results before updating this review'
availability = read(RAW/'curvas-availability-fetch.json')
assert availability['status'] == 429, 'Inspect the new availability response before updating this review'
runtime_path = ROOT/'src/circuits/generated/madrid.json'
runtime = read(runtime_path)
t11 = next(z for z in runtime['spectatorZones'] if z['zoneId']=='t11')
other = ROOT/'src/circuits/europe/madrid-ge1-2026.json'
other_proof = read(other) if other.exists() else {}
confirmed_other = bool(other_proof.get('sceneAcceptance',{}).get('accepted') and other_proof.get('zone')==t11)
overview = read(ROOT/'src/circuits/season-review/madrid-withdrawn-public-models.json')
assert hashlib.sha256((RAW/'map-xl.webp').read_bytes()).hexdigest() == overview['sourceSha256']
controls = read(ROOT/'src/circuits/europe/review.json')['madrid']['imageControls']
pixel = controls['12']
rgb = list(Image.open(RAW/'map-xl.webp').convert('RGB').getpixel(tuple(pixel)))
digest = base64.b32encode(hashlib.sha1(html_bytes).digest()).decode().rstrip('=')
report = {
    'circuitId':'madrid', 'season':2026, 'checkedAt':'2026-10-27', 'venueLabel':'GD12',
    'overviewSource':{'url':overview['sourceUrl'],'sha256':overview['sourceSha256']},
    'candidateSection':{'label':'Section 8 Silver Plus','source':capture['url'],
        'replaySha256':capture['sha256'],'cdxDigestMatchesReplay':digest==capture['cdx']['digest'],
        'facts':'Replay describes covered seating facing T13 braking and Enlazadas, with Monumental/Distrito Fan Zone access.',
        'gd12AssociationVerified':False,
        'limitation':'A similar viewing description is not an official section-to-GD12 crosswalk. Replay bytes differ from the CDX digest; do not authenticate the original capture.'},
    'detailAsset':{**{k:v for k,v in asset.items() if k!='head'},'validGeometry':False,'reason':'Publisher redirects the SVG request to an HTML error page despite HTTP 200. No SVG geometry was accepted.'},
    'archiveLookup':{'cdxRows':len(cdx),'availabilityEndpointStatus':availability['status'],
        'limitation':'Exact 2026 CDX lookup returned no rows; availability request was rate limited. Neither result proves no historical capture exists.'},
    'existingModel':{'zoneId':'t11','name':t11['name'],'availability':t11['availability'],
        'boundarySha256':hashlib.sha256(json.dumps(t11['boundary'],separators=(',',':')).encode()).hexdigest(),
        'gd12AssociationVerified':False},
    'legacyControlCaution':{'corner':12,'sourcePixel':pixel,'rgb':rgb,
        'observedDarkRoadPixel':max(rgb)<85,
        'limitation':'This old control is not a visible black-road centre pixel in the final overview. Recheck control semantics/layout before using the old global diagram transform for a GD12 footprint.'},
    'geometryAvailable':False,'associatedModelId':None,'runtimeChanged':False,
    'nextAction':'Retrieve a valid detailed 2026 stand plan or independently verifiable source outline and section crosswalk before deciding whether GD12 replaces t11 or needs a new model.'}
if confirmed_other:
    report['existingModel']['verifiedOtherVenue']='GE1–GE3'
    report['nextAction']='t11 is now the accepted GE1–GE3 seated model. Retrieve a valid detailed GD12 outline and crosswalk before adding a separate GD12 model; do not relabel t11 as GD12.'
output = ROOT/'src/circuits/season-review/madrid-gd12-source-review.json'
output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print(json.dumps({'venueLabel':'GD12','detailAssetValid':False,'cdxDigestMatchesReplay':report['candidateSection']['cdxDigestMatchesReplay'],'runtimeChanged':False}))
