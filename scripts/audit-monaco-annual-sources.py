"""Check event/year before treating an official URL as annual ticket evidence.
Image observations are manual, bound to downloaded hashes, not claimed OCR.
No runtime writes and no unverified stand is opened by this report.
"""
import hashlib,json,re
from pathlib import Path
import fitz

ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT/'research/season-review/monaco2026'
read=lambda p:json.loads(p.read_text('utf8'))
def retained(name):
    meta=read(CACHE/f'{name}-fetch.json');path=CACHE/meta.get('file',name+'.html')
    assert hashlib.sha256(path.read_bytes()).hexdigest()==meta['sha256'],'Source bytes changed; repeat content inspection'
    return meta,path

front,_=retained('ticket-front');prices,_=retained('official-prices2026');ticket,_=retained('official-tickets2026')
assert front['status']==200 and '2027' in front['finalUrl']
assert prices['status']==404
assert ticket['status']==200 and 'grand-prix-de-monaco-historique-2026' in ticket['finalUrl']
tariff,tariffPath=retained('acm-f1-tariff-gb')
# Fixed image inspected manually: GRANDSTANDS 2025, Thursday22 through Sunday25.
assert tariff['sha256']=='af4a2f6e2687d41ed1a81dcc9dabe91f3e9e9b1dae39300d21b6324b5507c451'
media,mediaPath=retained('fia-media2026');assert media['status']==200
assert media['sha256']=='cc2292a7243fc367f89df76cf08973728ba71731442ae62ff76359080833e04b'
doc=fitz.open(mediaPath);assert len(doc)==63
text=re.sub(r'\s+',' ',doc[20].get_text())
needle='VIP areas were created in 2019, above the T Grandstand'
assert needle.casefold() in text.casefold(),'Reinspect the official T vertical relation'
header=' '.join(p.get_text() for p in [doc[0],doc[1]])
assert '2026' in header and re.search(r'formula\s*1',header,re.I)
def item(meta,decision,**facts):
    return {k:meta[k] for k in ['url','finalUrl','status','sha256','checkedAt']}|{'acceptedAs2026OrdinaryInventory':False,'decision':decision,**facts}
report={'circuitId':'monaco','season':2026,'checkedAt':'2026-10-27',
    'retrievals':[item(front,'Current front page is2027; do not transfer its products to2026.',observedYear=2027),
                  item(prices,'No2026 price page acquired; HTTP404 is not an empty ticket inventory.'),
                  item(ticket,'Redirected to the2026 Historic Grand Prix; correct year, wrong event.',observedYear=2026,observedEvent='Monaco Historic Grand Prix'),
                  item(tariff,'Manually inspected official image explicitly says GRANDSTANDS2025; prior-year evidence only.',observedYear=2025,priorYearProductsObserved=['T covered','T high','T low','X1-X2'],observationMethod='Manual image inspection, not filename-year inference or OCR')],
    'verifiedCurrentMedia':{'url':media['url'],'sha256':media['sha256'],'pdfPage':21,'printedPage':26,'fact':'Official2026 media kit describes VIP areas created above T grandstand in2019.','scope':'Confirms a vertical relation; does not establish which2026 ordinary seats or access paths lie below the boxes.'},
    'unresolvedOrdinaryLabels':['E','M','X1','X2'],
    'layerCoverageQuestions':[{'zoneId':'t-rascasse','mapLabel':'T1–T3','existingModelScope':'Visible ordinary front band of the2D public map, not certified complete upper/covered seating.',
        'missingEvidence':'2026 ordinary T covered/high/low product inventory and the footprint/height relationship to overhead VIP boxes.',
        'nextAction':'Reconcile the full ordinary seating layers and access; do not assume a white VIP plan band excludes all ordinary seats underneath.','completionRequired':True}],
    'inventoryComplete':False,'limits':'Neither missing final-map labels nor rejected old/wrong-event pages prove cancellation. The2025 table cannot confirm2026 X1/X2 or T products. Preserve existing verified front-band geometry while the full T layer scope remains required.'}
target=ROOT/'src/circuits/season-review/monaco-annual-ticket-source-review.json';target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print('Annual source audit:2027 page,2025 image,404 and2026 Historic redirect rejected; T vertical coverage requires reconciliation')
