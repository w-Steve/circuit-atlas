"""Record public2026 ticket identities, not prices or organizer artwork."""
import json,re,hashlib,unicodedata
from pathlib import Path
import fitz
root=Path(__file__).resolve().parents[1]
raw=(root/'research/season-review/monza-2026-rechecked.pdf').read_bytes();sha=hashlib.sha256(raw).hexdigest()
if sha!='e329a9c80037914143c3ba3fdb79e61352aa0ebdb82d4dbc7f645a92a17294d2':raise ValueError('Recheck changed2026 source before extracting its inventory')
pdf=fitz.open(stream=raw,filetype='pdf')
pattern=r'(?m)^\s*(\d+(?:[ABCDEF]| BIS)?|GT|GF|P)\s*\n?\|\s*([^\n]+)'
tables=[re.findall(pattern,pdf[i].get_text()) for i in range(1,5)]
if any(set(t)!=set(tables[0]) for t in tables[1:]):raise ValueError('Public product lists differ by day; record those differences explicitly')
data=json.loads((root/'src/circuits/generated/monza.json').read_text('utf8'))
supplement_file=root/'src/circuits/europe/monza-supplement-2026.json'
supplement=json.loads(supplement_file.read_text('utf8')) if supplement_file.exists() else {}
assignments=supplement.get('productAssignments',{})
normal=lambda s:''.join(c for c in unicodedata.normalize('NFKD',s) if not unicodedata.combining(c)).upper()
families={normal(z['name']):z['zoneId'] for z in data['spectatorZones'] if not z['zoneId'].startswith('prato-')}
products=[]
ambiguous={'12':['ascari-uno','ascari-due','ascari-tre'],'13':['ascari-uno','ascari-due','ascari-tre'],'14':['ascari-uno','ascari-due','ascari-tre'],'17A':['uscita-ascari-a'],'17B':['uscita-ascari-b'],'18':['uscita-ascari-a','uscita-ascari-b']}
ambiguous.update({c:['seconda-variante'] for c in ['33A','33B']})
ambiguous.update({c:['vedano'] for c in ['35A','35B','35C']})
letteredFamilies={'6A','6B','6C','8A','8B','21A','21B','21C','21D','21E','23A','23B','26A','26B','26C'}
for code,name in tables[0]:
    identifier=code.lower().replace(' ','-')
    if code=='GT':identifier+='-'+re.search(r'\d+$',name)[0]
    if identifier in assignments:
        assignment=assignments[identifier]
        matches=assignment['modelZones'];association=assignment['association']
        assert all(any(z['zoneId']==id and z['availability']=='available' for z in data['spectatorZones']) for id in matches),'Apply source-associated supplement before rebuilding inventory'
    elif code=='P':
        matches=[z['zoneId'] for z in data['spectatorZones'] if z['zoneId'].startswith('prato-')];association='six geographic portions of one P product; local terrain/structures remain approximate'
    elif any(code in z.get('ticketCodes',[]) and z.get('identitySource') for z in data['spectatorZones']):
        matches=[z['zoneId'] for z in data['spectatorZones'] if code in z.get('ticketCodes',[]) and z.get('identitySource')];association='primary-source historical/current product code identity; existing footprint and rows are not a surveyed2026 seating boundary'
    elif code in ambiguous:matches=[];association='legacy model names do not establish this separately numbered product footprint; independent positional matching required'
    else:
        matches=[id for family,id in families.items() if normal(name)==family or code in letteredFamilies and normal(name).startswith(family+' ')]
        association='same-name model family only; exact letter/row boundary not certified' if matches else 'no verified dedicated product model association'
    products.append(dict(productId=identifier,code=code,name=name,kind='general-admission' if code=='P' else 'unnumbered-terrace' if code=='GF' else 'grandstand',modelZones=matches,association=association,candidateModelZones=[] if matches else ambiguous.get(code,[])))
if len(products)!=50 or len({p['productId'] for p in products})!=50:raise ValueError('Recheck product count or duplicate identities')
record=dict(circuitId='monza',season=2026,inventoryCheckedAt='2026-10-25',inventoryComplete=False,allListedProductsRecorded=True,
 scope='All50 ordinary public entries in the organizer2026 price tables (weekend/Sunday/Saturday/Friday agree). Product identities only, no live stock or surveyed seat-boundary claim. P is one product with six mapped geographic portions; GF terraces are distinct.',
 sources=[dict(url='https://www.monzanet.it/wp-content/uploads/2026/06/GP_F1_2026_LISTINO_PREZZI_6_17.pdf',sha256=sha,pages=[1,2,3,4],checkedAt='2026-10-25',evidence='All four public product tables contain the same50 code/name entries. Page0 marks six P strokes, separate from GF and numbered grandstands.')],
 areas=[dict(zoneId=z['zoneId'],name=z['name'],kind=z['kind']) for z in data['spectatorZones']],ticketProducts=products,
 approximateFamilyCoverageAccepted=all(p['modelZones'] for p in products),
 approximateSupplementReview='src/circuits/europe/monza-supplement-2026.json' if supplement else None,
 unresolved=['Approximate source-map families and code identities do not prove exact lettered/numbered2026 boundaries or admission between sectors.','Historical Ascari Uno/code15 is absent from the2026 table; no ordinal alias to13/14 and no demolition/closure inference.','GT/GF are seated concrete terrace approximations, distinct from standing P.','Prato microrelief, roofs, fences, trees, screens and crowds are not fully reconstructed.'],
 productsWithoutVerifiedModelAssociation=[dict(code=p['code'],name=p['name']) for p in products if not p['modelZones']])
(root/'src/circuits/season-review/monza-public-inventory.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
print(f'Monza: {len(products)} source products; {len(record["productsWithoutVerifiedModelAssociation"])} lack a verified model-family association; inventory not certified complete')
