"""Read-only source review; unnamed structures do not establish ticket identities."""
import hashlib,json,math,xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from shapely.geometry import Polygon
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
sha=lambda b:hashlib.sha256(b).hexdigest()
raw=(ROOT/'research/season-review/spa/la-source-20261028.xml').read_bytes()
meta=read('research/season-review/spa/la-source-20261028.meta.json')
assert meta['status']==200 and sha(raw)==meta['sha256']
data_path=ROOT/'src/circuits/generated/spa.json';data=read(str(data_path.relative_to(ROOT)))
metric=read('artifacts/goal-review/spa-native/road.json')
assert sha(data_path.read_bytes())==metric['generatedSha256'],'Re-export the current runtime road'
origin=metric['origin'];factor=[111320*math.cos(math.radians(origin[1]))*metric['calibration'],-111320*metric['calibration']]
xy=lambda p:[(p[i]-origin[i])*factor[i] for i in range(2)]
road=unary_union([Polygon(t) for t in metric['triangles']])
xml=ET.fromstring(raw);nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in xml.findall('node')}
ways={int(w.get('id')):w for w in xml.findall('way')};candidates=[]
for ident in [1366085152,1366085153,1366085154]:
 w=ways[ident];tags={t.get('k'):t.get('v') for t in w.findall('tag')};boundary=[nodes[n.get('ref')] for n in w.findall('nd')]
 assert tags.get('building')=='grandstand' and 'name' not in tags
 polygon=Polygon([xy(p) for p in boundary]);assert polygon.is_valid
 candidates.append(dict(way=ident,version=w.get('version'),timestamp=w.get('timestamp'),tags=tags,boundary=boundary,areaMetres2=polygon.area,renderedRoadOverlapMetres2=polygon.intersection(road).area,annualIdentityVerified=False))
held=[]
for zone in data['spectatorZones']:
 if zone['availability']=='available':continue
 p=Polygon([xy(p) for p in zone['boundary']])
 held.append(dict(zoneId=zone['zoneId'],recordedIssues=zone['geometryReview']['issues'],currentRenderedRoadOverlapMetres2=p.intersection(road).area))
record=dict(circuitId='spa',season=2026,checkedAt='2026-10-28',nativeSnapshot=meta,currentPackageSha256=metric['generatedSha256'],heldZones=held,nativeCandidates=candidates,
 sourceScope=dict(url='https://www.spagrandprix.com/en/ticketing/ticket/map',retrievedHtmlSha256=sha((ROOT/'research/season-review/spa/ticket-map.html').read_bytes()),annualMapVerified=False,note='Mixed year signals: structured event metadata says2026; concierge widget path says2027. Neither dates the inline grandstand map. Do not label the whole map2027 or certify it as2026 from these signals.'),
 requiredEvidence=['Tie the three unnamed native structures to the dated2026 Gold7/7Bis/7Ter/8 inventory before assigning identities; do not substitute the closest polygon.', 'Use source front/back edges and retain explicit estimated vertical profiles, then validate current road, pits, neighbors and actual seated views.'],runtimeApplied=False,sceneAccepted=False)
archive_meta=read('research/season-review/spa/map-20260114.meta.json')
archive=(ROOT/'research/season-review/spa/map-20260114.html').read_bytes()
assert archive_meta['status']==200 and sha(archive)==archive_meta['sha256']
text=archive.decode('utf8')
assert '2026-07-16' in text and '2026-07-19' in text and 'BELGIAN GRAND PRIX 2026' in text
class MapGroups(HTMLParser):
 def __init__(self):super().__init__();self.stack=[];self.groups={}
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if tag=='g':self.stack.append(attrs)
  if tag=='path':
   for group in self.stack:
    if group.get('id') in ['G7','G7-bis','G7-ter','G8']:
     self.groups.setdefault(group['id'],dict(attributes=group,paths=[]))['paths'].append(attrs)
 def handle_endtag(self,tag):
  if tag=='g' and self.stack:self.stack.pop()
parser=MapGroups();parser.feed(text)
products=[]
for ident in ['G7','G7-bis','G7-ter','G8']:
 group=parser.groups[ident];attrs=group['attributes'];path=group['paths'][0]
 assert path['fill']=='#FAB400' and attrs.get('data-zone-name') and attrs.get('data-zone-id')
 products.append(dict(mapId=ident,mapLabel=attrs['data-zone-title'],productId=attrs['data-zone-name'],ticketIds=attrs['data-zone-id'].split(','),pathId=path['id'],sourcePath=path['d'],sourcePathSha256=sha(path['d'].encode()),geographicBoundaryVerified=False))
assert len({p['productId'] for p in products})==4
record['annualIdentityEvidence']=dict(**archive_meta,capturedAt='2026-01-14T00:45:29Z',publisher='Spa Grand Prix',originalUrl='https://www.spagrandprix.com/en/ticketing/ticket/map',eventStartDate='2026-07-16',eventEndDate='2026-07-19',products=products,scope='Dated pre-event organizer ticket map confirms four separate product identities; schematic paths are not geographic footprints. Not a complete season inventory or proof of a final July layout.')
record['confirmedMissingProducts']=[dict(productId=p['productId'],mapLabel=p['mapLabel'],modelZoneId=None,source=archive_meta['url'],nextAction='Recover an independently associated physical footprint; do not merge this separate ticket product into Gold7.') for p in products if p['mapId'] in ['G7-bis','G7-ter']]
record['requiredEvidence'][0]='Four separate La Source ticket identities are verified in the January2026 organizer archive. Associate the three native unnamed structures independently; do not assume all four products fit those three structures.'
changeset=(ROOT/'research/season-review/spa/changeset-163463491.xml').read_bytes()
assert sha(changeset)=='ae4419f44d8a5fd46c09dc61e092785d94b33b94ace0c739efb451c4093b717f'
edit=ET.fromstring(changeset).find('changeset');edit_tags={t.get('k'):t.get('v') for t in edit.findall('tag')}
assert edit_tags['source']=='SPW(allonie) most recent aerial imagery'
ortho_meta=read('research/season-review/spa/la-source-ortho-2023.meta.json')
assert sha((ROOT/'research/season-review/spa/la-source-ortho-2023.png').read_bytes())==ortho_meta['sha256']
photo_url='https://www.spagrandprix.com/assets/d893c02c-991b-4d1f-8483-e80fea05e47a/360-gold-7.jpg'
photo=(ROOT/'research/season-review/spa/gold7-360.jpg').read_bytes()
assert sha(photo)=='601b5ec34d56e6d5ab9200059cbce84ab38c08b5fd853727a23d9b40417c0b16'
assert '/assets/d893c02c-991b-4d1f-8483-e80fea05e47a/360-gold-7.jpg' in (ROOT/'research/season-review/spa/gold7-page.html').read_text('utf8')
record['physicalReferenceEvidence']={
 'nativeEdit':{'url':'https://api.openstreetmap.org/api/0.6/changeset/163463491','sha256':sha(changeset),'source':edit_tags['source'],'note':'Three objects were drawn together in March2025 from aerial imagery; edit supplies no ticket identity.'},
 'orthophoto':{**ortho_meta,'catalogue':'https://geoportail.wallonie.be/catalogue/ad55c2ce-62ad-4c3c-b3cf-8fbc270a6b6e.html','publisher':'Service public de Wallonie','licence':'CC BY 4.0','nativeResolutionMetres':0.25,'observationWindow':['2023-05-27','2023-06-25'],'scope':'Historical physical layout only, not2026 temporary grandstand inventory or ticket boundary.'},
 'organizerPanorama':{'url':photo_url,'page':'https://www.spagrandprix.com/en/gold-7-source','sha256':sha(photo),'checkedAt':'2026-10-28','captureDateVerified':False,'shipped':False,'scope':'Visual reference showing a covered blue-seat stand, a neighboring uncovered bank and buildings across La Source. No surveyed camera position or annual footprint is provided.'},
 'interpretation':'The larger western roof is a Gold7 candidate, supported by relative roof/neighbor/track relationships. This remains an interpretation, not an accepted named OSM feature or complete2026 ticket boundary.',
 'identityAccepted':False}
target=ROOT/'src/circuits/season-review/spa-la-source-2026.json'
previous=read(str(target.relative_to(ROOT))) if target.exists() else {}
if previous.get('extensionEvidence'):
 extra=previous['extensionEvidence'];bis=extra['bis'];ter=extra['ter']
 assert sha((ROOT/'research/season-review/spa/gold7-bis-20260114.html').read_bytes())==bis['annualUncoveredEvidence']['sha256']
 assert sha((ROOT/'research/season-review/spa/gold7-bis-360.jpg').read_bytes())==bis['panorama']['sha256']
 assert sha((ROOT/'research/season-review/spa/gold7-ter-360.jpg').read_bytes())==ter['sha256']
 record['extensionEvidence']=extra
counter=previous.get('physicalReferenceEvidence',{}).get('organizerCounterView')
if counter:
 assert sha((ROOT/'research/season-review/spa/gold8-official-20261028.html').read_bytes())==counter['pageSha256']
 assert sha((ROOT/'research/season-review/spa/gold8-360.jpg').read_bytes())==counter['sha256']
 record['physicalReferenceEvidence']['organizerCounterView']=counter
 record['physicalReferenceEvidence']['interpretation']=previous['physicalReferenceEvidence']['interpretation']
accepted_path=ROOT/'src/circuits/europe/spa-gold7-2026.json'
if accepted_path.exists():
 accepted=read(str(accepted_path.relative_to(ROOT)));actual=next(z for z in data['spectatorZones'] if z['zoneId']==accepted['zone']['zoneId'])
 assert actual==accepted['zone'] and accepted['sceneAcceptance']['accepted']
 record['runtimeApplied']=True
 record['acceptedRegions']=[dict(zoneId=actual['zoneId'],nativeWay=accepted['nativeStandWay'],review=str(accepted_path.relative_to(ROOT)).replace('\\','/'),accuracy=accepted['sceneAcceptance']['accuracy'])]
 record['requiredEvidence'][0]='Gold7 physical association accepted for an explicitly approximate model using paired organizer panoramas and the dated annual product map; other products require independent boundaries.'
 record['physicalReferenceEvidence']['remainingSceneWork']=['Gold7 is migrated with estimated roof/posts and real occlusion. Keep annual structural continuity and precision limits explicit.','Resolve separate Bis/Ter footprints without reusing Gold7 for distinct products.']
gold8_path=ROOT/'src/circuits/europe/spa-gold8-2026.json'
if gold8_path.exists():
 accepted=read(str(gold8_path.relative_to(ROOT)));actual=next(z for z in data['spectatorZones'] if z['zoneId']==accepted['zone']['zoneId'])
 assert actual==accepted['zone'] and accepted['sceneAcceptance']['accepted']
 record['acceptedRegions'].append(dict(zoneId=actual['zoneId'],nativeWay=accepted['nativeStandWay'],review=str(gold8_path.relative_to(ROOT)).replace('\\','/'),accuracy=accepted['sceneAcceptance']['accuracy']))
 record['requiredEvidence'][0]='Gold7 and Gold8 admitted as separately associated approximate roofed stands. Bis/Ter remain separate products without accepted geographic boundaries; do not merge or assign the intermediate bank by proximity.'
 record['physicalReferenceEvidence']['remainingSceneWork'][0]='Gold7 and Gold8 migrated with estimated roof/posts and shared barriers. Keep annual continuity and precision limitations explicit.'
bis_path=ROOT/'src/circuits/europe/spa-gold7-bis-2026.json'
if bis_path.exists():
 accepted=read(str(bis_path.relative_to(ROOT)))
 actual=next((z for z in data['spectatorZones'] if z['zoneId']==accepted['zone']['zoneId']),None)
 if accepted['sceneAcceptance']['accepted']:
  assert actual==accepted['zone'] and accepted['covered'] is False
  record['acceptedRegions'].append(dict(zoneId=actual['zoneId'],nativeWay=accepted['nativeStandWay'],review=str(bis_path.relative_to(ROOT)).replace('\\','/'),accuracy=accepted['sceneAcceptance']['accuracy']))
  record['confirmedMissingProducts']=[p for p in record['confirmedMissingProducts'] if p['productId']!=actual['zoneId']]
  record['requiredEvidence'][0]='Gold7, Gold8 and independent uncovered Bis admitted as approximate models. Ter remains a separate missing product west of Gold7; recover its own geographic boundary.'
  record['extensionEvidence']['bis']['scope']='Migrated independent uncovered approximation; paired original row edges avoid endpoint self-blocking. Heights/rails/aisles remain estimates.'
  record['physicalReferenceEvidence']['remainingSceneWork']=['Preserve shared barriers and explicit structural precision limits for all three admitted regions.','Recover the separate Ter footprint west of Gold7; do not reuse Bis.']
target.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8')
print('Spa: held footprints reviewed:',len(held),'; native candidates:',[(r['way'],round(r['renderedRoadOverlapMetres2'],3)) for r in candidates])
