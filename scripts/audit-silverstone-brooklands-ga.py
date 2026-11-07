"""Separate the positive ordinary-GA band, native bank and restricted platform.
Source review only: no runtime ground, scene or availability is written.
"""
import hashlib,json,math,xml.etree.ElementTree as ET
from pathlib import Path
import fitz
from shapely.geometry import Polygon,LineString
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
sha=lambda b:hashlib.sha256(b).hexdigest()
pdf=ROOT/'research/season-review/silverstone-abbey/2026-map-mirror.pdf';annual=read('src/circuits/season-review/silverstone-ga-access-2026.json')['annualMap'];assert sha(pdf.read_bytes())==annual['sha256']
doc=fitz.open(pdf);page=doc[0];drawing=page.get_drawings()[39];legend=page.get_drawings()[1236];assert drawing['color']==legend['color'] and drawing['width']==7
platform_label=' '.join(page.get_textbox(fitz.Rect(980,77,1080,99)).split());assert 'Mainstage Accessible Viewing Platform' in platform_label
raw_path=ROOT/'research/season-review/silverstone-ga/brooklands-east-osm-20261028.xml';meta=read(str(raw_path.with_suffix('.meta.json').relative_to(ROOT)));raw=raw_path.read_bytes();assert meta['status']==200 and sha(raw)==meta['sha256']
xml=ET.fromstring(raw);nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in xml.findall('node')};ways={int(w.get('id')):w for w in xml.findall('way')}
native=lambda ident:[nodes[n.get('ref')] for n in ways[ident].findall('nd')]
tags=lambda ident:{t.get('k'):t.get('v') for t in ways[ident].findall('tag')}
data=read('src/circuits/generated/silverstone.json');metric=read('artifacts/goal-review/silverstone-standing-metric.json');assert metric['inputs']=={k:data[k] for k in ['trackGeometry','corners','elevation']}
origin=metric['origin'];scale=[111320*math.cos(math.radians(origin[1]))*metric['calibration'],-111320*metric['calibration']]
xy=lambda p:[(p[i]-origin[i])*scale[i] for i in range(2)]
bank=Polygon([xy(p) for p in native(1430385977)]);gp=Polygon([xy(p) for p in data['trackGeometry']['coordinates']]);fence=LineString([xy(p) for p in native(804928144)])
assert bank.is_valid and tags(1430385977)=={'landuse':'grass'} and tags(804928144)['barrier']=='fence'
controls=[[item[0],*[list(p) for p in item[1:]]] for item in drawing['items']]
source_path_sha=sha(json.dumps(controls,separators=(',',':')).encode());expected=next(a for a in read('src/circuits/season-review/silverstone-ga-access-2026.json')['ordinaryGA']['cartographicBandGroups'] if a['drawingIndex']==39);assert source_path_sha==expected['sourcePathSha256']
crossing=fence.intersection(bank).difference(bank.boundary).length;assert crossing>10
record={'circuitId':'silverstone','season':2026,'checkedAt':'2026-10-28','annualMap':annual,'ordinaryGA':{'drawingIndex':39,'sourcePathSha256':source_path_sha,'admissionCategory':'General Admission Viewing','positiveLocationVerified':True,'geographicTicketBoundaryVerified':False,'notes':'Relative position follows the outside peninsula between Brooklands and Luffield, not an automatic grant of every inner-curve grass polygon. Being inside/outside the GP polygon alone does not establish ticket rights.'},'nativeSnapshot':meta,'bankCandidate':{'way':1430385977,'tags':tags(1430385977),'boundary':native(1430385977),'areaMetres2':bank.area,'representativePointInsideGP':gp.contains(bank.representative_point()),'gpPolygonOverlapMetres2':bank.intersection(gp).area,'admissionNotInferredFromLanduse':True},'fenceConflict':{'way':804928144,'sharedBankBoundaryMetres':fence.intersection(bank.boundary).length,'interiorCrossingMetres':crossing,'publicSideIdentified':False,'notes':'The native fence crosses the landuse polygon. Do not enable the whole parcel or choose a side merely because it is grass.'},'platform65':{'mapNumber':65,'mapLabel':'Mainstage Accessible Viewing Platform','role':'accessibility platform, not ordinary GA ground or GA Plus','geographicBoundaryVerified':False,'heightVerified':False,'raceViewingRoleVerified':False,'notes':'No explicitly named corresponding native object established in the inspected snapshot. Eligibility and actual footprint must not be copied from MotoGP/2024/2027 pages.'},'unacceptedAlternative':{'way':606064746,'tags':tags(606064746),'reason':'Unnamed bleachers are not proof of platform65 identity or2026 ordinary GA admission.'},'excludedAdmissionInferences':[{'way':ident,'representativePointInsideGP':gp.contains(Polygon([xy(p) for p in native(ident)]).representative_point()),'reason':'Different native island/road-side relation from band39. No positive association with this ordinary-GA band; GP containment alone is not proof of restricted access either.'} for ident in [605869303,605869304]],'queryCoverageCorrection':{'firstSnapshot':'research/season-review/silverstone-ga/luffield-osm-20261028.xml','expandedSnapshot':'research/season-review/silverstone-ga/brooklands-east-osm-20261028.xml','method':'Named stand labels only guided query coverage; no map-label affine was promoted to runtime geometry or claimed as survey accuracy.'},'requiredEvidence':['Identify the spectator side/extent of fence804928144 with2026 organizer geography or independently tied site evidence.','Locate platform65 footprint and height, or demonstrate it lies outside the selectable ordinary-GA envelope.'],'runtimeApplied':False,'sceneAccepted':False,'limits':'A positive2026 GA map band and a plausible native bank have been identified; physical subdivision and accessible-platform clearance remain unresolved. No synthetic blanket grass zone is published.'}
record['platform65']['annualAccessEvidence']={
 'url':'https://help.silverstone.co.uk/hc/en-gb/articles/34891537071005--Wheelchair-seating-areas',
 'publisher':'Silverstone','articleUpdatedAt':'2026-03-25','checkedAt':'2026-10-28','season':2026,
 'facts':['The F1 wheelchair platforms require booking through the organizer; the article states2026 platforms are sold out.',
          'Main Stage AVP permits General Admission holders on Friday and Saturday, subject to available space and arrival order.'],
 'ordinaryGAAccessDays':['Friday','Saturday'],'sundayOrdinaryGAAccessVerified':False,
 'geographicFootprintProvided':False,'platformHeightProvided':False,
 'mapAssociation':'Annual map names Mainstage Accessible Viewing Platform; the article names Main Stage AVP. This supports the facility/access association, not a surveyed footprint or race-viewing claim.'}
record['platform65']['notes']='Annual F1 access terms are now independently sourced; do not classify this platform as always forbidden to GA. Native footprint, height, Sunday terms and race-viewing role remain unverified.'
path=ROOT/'src/circuits/season-review/silverstone-brooklands-ga-2026.json';path.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf8');doc.close()
print(f'Band39 located; native bank{bank.area:.1f}m2, fence interior crossing{crossing:.1f}m. Platform65 remains separate; no runtime release.')
