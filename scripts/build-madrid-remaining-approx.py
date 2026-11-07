"""Adopt named annual banks as explicitly approximate experiences, not ticket advice."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
g=read('src/circuits/generated/madrid.json')
out={'circuitId':'madrid','season':2026,'beforeZones':[],'zones':[],
 'scope':'Approximate annual named viewing banks. Ordinary-ticket entitlement and hospitality allocation remain unresolved; runtime availability denotes a conceptual viewpoint, not permission to enter.',
 'sources':['https://www.madring.com/img/xl/mapa-madring/mapa_web_11_8_26_ing.webp','https://www.20minutos.es/deportes/deportes_motor/formula-1/cuales-son-mejores-gradas-madring-circuito-formula-1-madrid-que-se-vera-desde-cada-zona_7029717_0.html']}
for p in ['src/circuits/europe/madrid-ge23-2026.json','src/circuits/europe/madrid-inner-world-candidate-2026.json']:
 z=copy.deepcopy(read(p)['zone']);old=next(a for a in g['spectatorZones'] if a['zoneId']==z['zoneId'])
 assert old['availability']=='preparing'
 out['beforeZones'].append(copy.deepcopy(old))
 z['availability']='available'
 z['admissionNote']='近似观赛范围；普通票与贵宾票的分区准入未核实，不代表单张门票可跨区通行。'
 z['description']='2026图示座席的近似视角；边界、排数及高度含估计，顶棚与局部设施尚未完整还原。'
 z['geometryReview']={'checkedAt':'2026-11-06','issues':[],
  'method':'Explicit approximation of separate annual source seat ribbons; source occluded edges and estimated vertical profile retained as uncertainty, not claimed as surveyed.'}
 z['source']['notes']+=' Accepted as explicit approximate annual named viewing bank; no certified ticket entitlement.'
 z['openingSource']={'url':out['sources'][0],'checkedAt':'2026-11-06','method':'published','confidence':'medium',
  'notes':'Official2026 site map names these banks; dated2026 report corroborates. Conceptual viewpoint availability only, ordinary/hospitality access allocation unresolved.'}
 out['zones'].append(z)
p=ROOT/'src/circuits/europe/madrid-remaining-approx-2026.json'
assert not p.exists(),'Preserve existing review'
p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
