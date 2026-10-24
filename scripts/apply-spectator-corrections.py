"""Apply individually sourced footprint corrections, never arbitrary road offsets."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def read(path):return json.loads((root/path).read_text(encoding='utf-8'))
def write(path,data):(root/path).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
patch=read('src/circuits/europe/monaco-2026-footprint-corrections.json')
path='src/circuits/generated/monaco.json';data=read(path)
standing=read('src/circuits/season-review/monaco-standing-evidence.json')
z=next(z for z in data['spectatorZones'] if z['zoneId']=='z-quai-kennedy')
z['kind']='general-admission'
z['openingSource']={'url':standing['source'],'checkedAt':standing['checkedAt'],'method':'published','confidence':'high','notes':standing['evidence']+' '+standing['scope']}
for correction in patch['areas']:
    if correction['roadOverlapSquareMetres']>1e-6:raise ValueError('Footprint still intersects the road')
    zone=next(z for z in data['spectatorZones'] if z['zoneId']==correction['zoneId'])
    boundary=correction['boundary'];depth=correction['depth'];rise=round(min(16,max(3,depth*.48)),2)
    zone['boundary']=boundary
    zone['surface'].update(depth=round(depth,2),rise=rise)
    zone['surfaces']=[{'surfaceId':zone['zoneId']+'-1','boundary':boundary,'baseHeight':zone['surface']['baseHeight'],
        'rise':rise,'eyeHeight':1.2,'rows':max(6,round(rise/.5)),'frontReference':correction['frontReference']}]
    zone['source']={'url':patch['source'],'checkedAt':patch['checkedAt'],'method':'estimated','confidence':'low',
        'notes':patch['method']+' '+patch['precision']}
    zone['availability']='available'
    zone['geometryReview']={'checkedAt':patch['checkedAt'],'issues':[],
        'method':'Corrected official vector footprint / rendered road triangle intersection; broad-face road reference; independently checked against other available footprints.'}
data['spectatorZoneIds']=[z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
write(path,data)
summaries=read('src/circuits/generated/summaries.json')
next(s for s in summaries if s['circuitId']=='monaco')['spectatorZoneIds']=data['spectatorZoneIds']
write('src/circuits/generated/summaries.json',summaries)
review=read('src/circuits/europe/geometry-review.json')
for c in patch['areas']:
    row=next(r for r in review if r['circuitId']=='monaco' and r['zoneId']==c['zoneId'])
    row.update(availability='available',issues=[],surfaces=[{'surfaceId':c['zoneId']+'-1','roadOverlapSquareMetres':c['roadOverlapSquareMetres'],
        'nearestRoadObliquityDegrees':round(c['obliquity'],2),'frontReference':c['frontReference']}])
write('src/circuits/europe/geometry-review.json',review)
print('Monaco N/O/P corrected from the source footprints; 4 available, remaining candidates still withheld')
