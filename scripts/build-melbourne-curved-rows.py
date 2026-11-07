"""Migrate only the accepted Senna/Prost row topology; retain all source geometry.
The main footprint registration must not be rerun to repair seating interpolation.
"""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'src/circuits/asia/melbourne-stands-2026.json'
record=json.loads(path.read_text('utf8'))
data=json.loads((ROOT/'src/circuits/generated/melbourne.json').read_text('utf8'))
prior=record.get('curvedRowMigration') or dict(previousAcceptedZones=[copy.deepcopy(z) for z in record['zones'] if z['zoneId'] in ['senna','prost']],previousSceneAcceptance=record.get('sceneAcceptance'))
for old in prior['previousAcceptedZones']:
 zone=copy.deepcopy(old);surface=zone['surfaces'][0];boundary=surface['boundary']
 front,back={'senna':([2,3,4,5],[1,0,7,6]),'prost':([0,1,2,3],[7,6,5,4])}[zone['zoneId']]
 surface['rowStrip']=dict(front=[boundary[k] for k in front],back=[boundary[k] for k in back],source=dict(zone['source'],notes='Paired original front/rear bend vertices of the verified2026 blue footprint. Organizer GP26 photographs independently corroborate curved continuous seating; estimated pairing, not surveyed rows or heights.'))
 zone['surfaceSource']['notes']+=' Continuous rows follow paired source front/rear polylines; original estimated rise/count, ground reference and seated eye remain unchanged.'
 zone['availability']='preparing';zone['geometryReview']=dict(old['geometryReview'],checkedAt='2026-10-26',issues=['Awaiting continuous-row mesh and browser review.'])
 current=next(z for z in data['spectatorZones'] if z['zoneId']==zone['zoneId'])
 structural=lambda z:{k:v for k,v in z.items() if k not in ['availability','geometryReview']}
 if structural(current) not in [structural(old),structural(zone)]:raise ValueError('Accepted stand was edited; preserve changes: '+zone['zoneId'])
 existing=next(z for z in record['zones'] if z['zoneId']==zone['zoneId'])
 if structural(existing)==structural(zone):zone.update(availability=existing['availability'],geometryReview=existing['geometryReview'])
 record['zones']=[zone if z['zoneId']==zone['zoneId'] else z for z in record['zones']]
prior['method']='Retain the complete previously accepted footprint and profile; use paired original front/rear bend vertices for continuous row interpolation, without visibility fitting.'
record['curvedRowMigration']=prior
if any(z['availability']!='available' for z in record['zones']):record['sceneAcceptance']={'accepted':False,'reason':'Awaiting Senna/Prost continuous-row acceptance; previous evidence retained in curvedRowMigration.'}
path.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
print('Two curved row definitions prepared. Other17 stands unchanged.')
