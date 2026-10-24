"""Record completeness gaps separately from geometric compatibility checks.

No candidate becomes available merely by passing this inventory report.
Missing GA polygons and withheld areas remain explicit work, never fake passes.
"""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
records=[]
for summary in json.loads((root/'src/circuits/generated/summaries.json').read_text(encoding='utf-8')):
    data=json.loads((root/f'src/circuits/generated/{summary["circuitId"]}.json').read_text(encoding='utf-8'))
    zones=data['spectatorZones'];available=[z for z in zones if z['availability']=='available']
    withheld=[z for z in zones if z['availability']!='available'];ga=[z for z in zones if z['kind']!='grandstand']
    evidence=root/f'src/circuits/season-review/{data["circuitId"]}-public-inventory.json'
    complete=False
    if evidence.exists():
        inventory=json.loads(evidence.read_text(encoding='utf-8'))
        complete=inventory.get('inventoryComplete',False) and {a['zoneId'] for a in inventory['areas']}=={z['zoneId'] for z in zones}
    records.append({'circuitId':data['circuitId'],'season':2026,'calendarCheckedAt':'2026-10-24',
      'calendarSource':'https://www.formula1.com/en/racing/2026',
      'modeledAvailableCount':len(available),'withheldCount':len(withheld),'nonGrandstandCount':len(ga),
      'inventoryComplete':complete,
      'requiredWork':([] if complete else ['Reconcile all public 2026 grandstands and general-admission areas against a complete organizer map.'])+
        (['Verify missing grass/general-admission inventory; no such areas are currently recorded.'] if not ga else [])+
        (['Re-digitize or reject withheld source polygons based on 2026 evidence, not mechanical relocation.'] if withheld else []),
      'areas':[{'zoneId':z['zoneId'],'name':z['name'],'kind':z['kind'],'availability':z['availability'],
          'source':z['source']['url'],'openingSource':z.get('openingSource',{}).get('url'),
          'geometryIssues':z.get('geometryReview',{}).get('issues',[])} for z in zones]})
target=root/'src/circuits/season-review';target.mkdir(exist_ok=True)
(target/'inventory-2026.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
monaco={'circuitId':'monaco','season':2026,'checkedAt':'2026-10-24',
  'source':'https://acm.mc/epreuves/formula-1-grand-prix-de-monaco/infos-pratiques/informations-liees-a-lachat-de-billet-ou-de-package/',
  'evidence':'Organizer explicitly distinguishes seated tickets from standing places in sectors Z and Rocher.',
  'confirmedStandingAreas':[{'name':'Z','zoneId':'z-quai-kennedy','modelClassification':'general-admission','geometryResolved':False},
                            {'name':'Secteur Rocher','zoneId':None,'modelPresent':False}],
  'scope':'Confirms ticket class and season, not geographic boundaries. Hospitality map alone is not a complete public ticket inventory.'}
(target/'monaco-standing-evidence.json').write_text(json.dumps(monaco,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(records)} circuits; {sum(r["modeledAvailableCount"] for r in records)} available; {sum(r["withheldCount"] for r in records)} withheld; {sum(r["nonGrandstandCount"]==0 for r in records)} need GA inventory checks')
