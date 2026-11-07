"""Extract minimal annual GA facts, not copyrighted map artwork or fake GIS.
Requires the retained organizer PDF and source HTML snapshots in research/.
No runtime geometry is written. Thin cyan auxiliary paths are not the solid GA bands.
"""
import hashlib,json,xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
import fitz
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'research/season-review/silverstone-ga'
PDF=ROOT/'research/season-review/silverstone-abbey/2026-map-mirror.pdf'
OUT=ROOT/'src/circuits/season-review/silverstone-ga-access-2026.json'
read=lambda p:json.loads(p.read_text('utf8'))
sha=lambda b:hashlib.sha256(b).hexdigest()
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[]
 def handle_data(self,data):self.parts.append(data)

def audit():
 guide=RAW/'2026-guide.html';meta=read(RAW/'2026-guide.meta.json')
 if meta['status']!=200 or sha(guide.read_bytes())!=meta['sha256']:raise ValueError('Guide snapshot changed')
 parser=Text();parser.feed(guide.read_text('utf8'));text=' '.join(' '.join(parser.parts).split())
 if 'Silverstone F1® Tickets 2026: Your Guide' not in text or 'Unreserved viewing areas (no grandstand)' not in text or 'Standing or bring your own chair' not in text:raise ValueError('Annual GA admission facts not verified')
 if sha(PDF.read_bytes())!='3516fbf5bdab374c4a4f53b8a975cbd9ea0714408bd11f6be3c198f05f3e336c':raise ValueError('Annual map changed')
 doc=fitz.open(PDF);page=doc[0];words=' '.join(page.get_text().split());drawings=page.get_drawings()
 if 'General Admission Viewing' not in words:raise ValueError('Positive GA map legend missing')
 # The colored legend line is beside its extracted text, below the actual map.
 legend=[(i,d) for i,d in enumerate(drawings) if d.get('color') and d['color'][0]<.01 and d['color'][1]>.5 and d['color'][2]>.8 and 4<d.get('width',0)<6 and d['rect'].y0>700]
 if len(legend)!=1:raise ValueError('Ambiguous positive viewing legend')
 index,key=legend[0];color=key['color'];bands=[];thin=[]
 for i,d in enumerate(drawings):
  if d.get('color')!=color:continue
  if abs(d.get('width',0)-1)<1e-6:thin.append(i);continue
  if abs(d.get('width',0)-7)>1e-6:continue
  # Keep a checksum and bounding box for audit, not the full vector artwork.
  controls=[[item[0],*[list(p) for p in item[1:]]] for item in d['items']]
  bands.append({'drawingIndex':i,'sourcePathSha256':sha(json.dumps(controls,separators=(',',':')).encode()),'itemCount':len(controls),'rectPdfPoints':list(d['rect']),'strokeWidthPdfPoints':d['width'],'coordinateSpace':'PDF points, not longitude/latitude','geographicBoundaryVerified':False})
 if len(bands)!=5 or thin!=[92,93]:raise ValueError('Changed viewing/auxiliary path classification')
 plus=[(42,'Abbey GA Plus'),(44,'Luffield Terrace GA Plus'),(45,'Copse A GA Plus'),(46,'Copse C GA Plus'),(66,'Landostand GA Plus')]
 for number,label in plus:
  if label not in words:raise ValueError(f'Final annual GA+ label missing:{label}')
 if 'Luffield Complex Accessible Viewing' not in words:raise ValueError('Do not classify accessible-platform legend as ordinary GA+')
 native=ROOT/'research/season-review/silverstone-village-a/osm-20261028.xml';native_meta=read(native.with_suffix('.json'))
 if sha(native.read_bytes())!=native_meta['sha256']:raise ValueError('Native ground snapshot changed')
 ways={w.get('id'):w for w in ET.fromstring(native.read_bytes()).findall('way')}
 for ident in ['359218994','359218995','359218998']:
  refs=[n.get('ref') for n in ways[ident].findall('nd')]
  if refs[0]==refs[-1]:raise ValueError('Reconcile changed boundary closure')
 zone_ids={z['zoneId'] for z in read(ROOT/'src/circuits/generated/silverstone.json')['spectatorZones']}
 missing=[{'productId':'general-admission','mapLabel':'General Admission','modelZoneId':None,'source':meta['url'],'scope':'One admission product with five drawn positive band groups; path count is not ticket count.'},
 {'productId':'general-admission-plus','mapLabel':'GA Plus','modelZoneId':None,'source':meta['url'],'scope':'Reserved viewing product with five explicit final-map locations; not ordinary GA access.'}]
 if any(a['productId'] in zone_ids for a in missing):raise ValueError('Reconcile newly modeled GA before retaining missing-product status')
 record={'circuitId':'silverstone','season':2026,'checkedAt':'2026-10-28','guideSnapshot':meta,'annualMap':{'url':'https://gpdestinations.com/wp-content/uploads/2026/06/2026-British-GP-Silverstone-Spectator-Map.pdf','publisher':'Silverstone','sha256':sha(PDF.read_bytes()),'page':1},
 'ordinaryGA':{'annualAdmissionVerified':True,'unreserved':True,'grandstandAdmissionIncluded':False,'modelPosture':'standing','eyeHeightMetres':1.65,'positiveMapLegend':{'drawingIndex':index,'strokeColor':color,'strokeWidthPdfPoints':key['width']},'cartographicBandGroups':bands,'excludedSameColorAuxiliaryPathIndices':thin,'geographicBoundaryVerified':False},
 'gaPlus':{'annualAdmissionVerified':True,'requiresSpecificReservedArea':True,'locations':[{'mapNumber':n,'mapLabel':label,'geographicBoundaryVerified':False} for n,label in plus]},
 'accessibilityScopeQuestions':[{'mapNumber':43,'mapLabel':'Luffield Complex Accessible Viewing','reason':'Final-map label identifies an accessible platform; not a sixth ordinary GA+ ground. Verify annual eligibility and physical platform separately.'}],
 'annualNameQuestions':[{'guideName':'Copse Yard','mapLabel':'Inside Nine','mapNumber':60,'reason':'The2026 guide describes a Copse Yard viewing bank while the final map labels Inside Nine. No direct identity link verified; do not duplicate or equate products.'}],
 'confirmedMissingProducts':missing,'nativeFarmCrosscheck':{'snapshot':native_meta,'standWay':227342449,'openFenceWays':[359218994,359218995,359218998],'nearbyGrassNotAdmissionProof':[605927342,605927344,605924470],'boundaryClosed':False,'result':'Nearby landuse polygons lie behind the stand or across the raceway; open fences do not establish a complete positive GA viewing boundary.'},
 'publicAppDiscovery':{'officialPage':'https://www.silverstone.co.uk/news/essentials-2026-british-grand-prix','appStoreId':6448953849,'androidPackage':'com.f1ss.venue.app','result':'Inspected primary pages link to the official native app stores; no public geographic viewing-layer URL was established. This is not proof that no such data exists.'},
 'runtimeApplied':False,'limits':'Map-space evidence verifies positive viewing locations and product distinctions, not geographic polygons or2026 surface elevations. No full PDF/artwork or HTML is redistributed. GA+ and enclosures must not be granted by ordinary GA. Existing BOXPARK GA remains a separate unresolved model representation.'}
 nps_path=ROOT/'src/circuits/europe/silverstone-national-ga-2026.json'
 if nps_path.exists():
  nps=read(nps_path)
  if nps['sceneAcceptance'].get('accepted'):
   from importlib.util import spec_from_file_location,module_from_spec
   spec=spec_from_file_location('nps_review',ROOT/'scripts/apply-silverstone-national-ga.py');module=module_from_spec(spec);spec.loader.exec_module(module)
   data=read(ROOT/'src/circuits/generated/silverstone.json');zone,stand,layer=module.reviewed(data,nps)
   assert module.physical(next(z for z in data['spectatorZones'] if z['zoneId']==zone['zoneId']))==module.physical(zone)
   assert module.physical(next(z for z in data['spectatorZones'] if z['zoneId']==stand['zoneId']))==module.physical(stand)
   assert read(ROOT/'src/circuits/barriers/silverstone.json')==layer
   record['runtimeApplied']=True
   record['ordinaryGA'].update(modeledBandGroups=[{'drawingIndex':38,'modelZoneId':zone['zoneId'],'boundaryStatus':'interpreted-approximate','sourceReview':str(nps_path.relative_to(ROOT)).replace('\\','/')}],remainingMapBandIndices=[37,39,40,41])
   record['partialStandingProducts']=[{'productId':'general-admission','modelZoneIds':[zone['zoneId']],'modeledDrawingIndices':[38],'remainingDrawingIndices':[37,39,40,41],'complete':False}]
   record['confirmedMissingProducts']=[p for p in missing if p['productId']!='general-admission']
 vale_path=ROOT/'src/circuits/europe/silverstone-vale-2026.json'
 if vale_path.exists():
  vale=read(vale_path)
  record['nativeValeCrosscheck']={'sourceReview':'src/circuits/europe/silverstone-vale-2026.json','standWay':vale['nativeStandWay'],'groundWay':vale['nativeGroundWay'],'sharedStandNodeIds':vale['groundSharedStandNodeIds'],'mapDrawingIndex':41,'runtimeGAAdded':False,'result':'Named native Vale stand and its attached grass patch located. Native landuse boundary is not proof that the whole patch is2026 ordinary GA; complete ticket scope remains unverified.'}
 vale_ga_path=ROOT/'src/circuits/europe/silverstone-vale-ga-2026.json'
 if vale_ga_path.exists():
  ga=read(vale_ga_path)
  if ga['sceneAcceptance'].get('accepted'):
   from importlib.util import spec_from_file_location,module_from_spec
   spec=spec_from_file_location('vale_ga_review',ROOT/'scripts/apply-silverstone-vale-ga.py');module=module_from_spec(spec);spec.loader.exec_module(module)
   data=read(ROOT/'src/circuits/generated/silverstone.json');zone=module.reviewed(data,ga)
   assert module.physical(next(z for z in data['spectatorZones'] if z['zoneId']==zone['zoneId']))==module.physical(zone)
   record['ordinaryGA']['modeledBandGroups'].append({'drawingIndex':41,'modelZoneId':zone['zoneId'],'boundaryStatus':'interpreted-approximate','coverage':'stand-front subset, not complete ticket boundary','sourceReview':'src/circuits/europe/silverstone-vale-ga-2026.json'})
   record['ordinaryGA']['remainingMapBandIndices']=[37,39,40]
   record['ordinaryGA']['partiallyModeledMapBandIndices']=[38,41]
   record['partialStandingProducts'][0].update(modelZoneIds=[a['modelZoneId'] for a in record['ordinaryGA']['modeledBandGroups']],modeledDrawingIndices=[38,41],remainingDrawingIndices=[37,39,40],partialDrawingIndices=[38,41])
   record['nativeValeCrosscheck'].update(runtimeGAAdded=True,modeledSubsetZoneId=zone['zoneId'],fullNativeGroundGranted=False)
 farm_path=ROOT/'src/circuits/europe/silverstone-farm-ga-2026.json'
 if farm_path.exists():
  farm=read(farm_path)
  if farm['sceneAcceptance'].get('accepted'):
   from importlib.util import spec_from_file_location,module_from_spec
   spec=spec_from_file_location('farm_ga_review',ROOT/'scripts/apply-silverstone-farm-ga.py');module=module_from_spec(spec);spec.loader.exec_module(module)
   data=read(ROOT/'src/circuits/generated/silverstone.json');zone,stand,layer=module.reviewed(data,farm)
   for z in [zone,stand]:assert module.physical(next(a for a in data['spectatorZones'] if a['zoneId']==z['zoneId']))==module.physical(z)
   assert read(ROOT/'src/circuits/barriers/silverstone-farm.json')==layer
   record['previousNativeFarmCrosscheck']=record['nativeFarmCrosscheck']
   record['nativeFarmCrosscheck']={**record['nativeFarmCrosscheck'],'snapshot':farm['nativeSnapshot'],'openFenceWays':farm['nativeFenceWays'],'nativeGraphConnected':True,'modeledEnvelopeClosed':True,'boundaryClosed':False,'sourceConnections':farm['sourceConnections'],'sourceReview':'src/circuits/europe/silverstone-farm-ga-2026.json','result':'Expanded query recovers997 connecting the physical foreground graph. East endpoint cap is interpreted, so no closed native ticket GIS is claimed; rear/inside-track grass remains excluded.'}
   record['ordinaryGA']['modeledBandGroups'].append({'drawingIndex':40,'modelZoneId':zone['zoneId'],'boundaryStatus':'interpreted-approximate','coverage':'connected Farm stand-front envelope with interpreted east cap','sourceReview':'src/circuits/europe/silverstone-farm-ga-2026.json'})
   record['ordinaryGA']['modeledBandGroups'].sort(key=lambda a:a['drawingIndex'])
   record['ordinaryGA']['remainingMapBandIndices']=[37,39];record['ordinaryGA']['partiallyModeledMapBandIndices']=[38,40,41]
   record['partialStandingProducts'][0].update(modelZoneIds=[a['modelZoneId'] for a in record['ordinaryGA']['modeledBandGroups']],modeledDrawingIndices=[38,40,41],remainingDrawingIndices=[37,39],partialDrawingIndices=[38,40,41])
 OUT.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8');doc.close()
 print('Silverstone:5 positive map-space GA band groups;5 GA+ locations;1 separate accessible-platform question. Runtime coverage is reported separately from complete geographic verification.')

if __name__=='__main__':audit()
