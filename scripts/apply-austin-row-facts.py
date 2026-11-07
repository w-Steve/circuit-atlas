"""Apply annual row facts without changing footprints, heights or availability."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
digest=lambda v:hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def apply_facts(data,record):
 if data['circuitId']!='austin' or data['season']!=record['season']:raise ValueError('Wrong annual package')
 result=copy.deepcopy(data)
 for a in record['areas']:
  z=next(z for z in result['spectatorZones'] if z['zoneId']==a['zoneId'])
  s=next(s for s in z['surfaces'] if s['surfaceId']==a['surfaceId'])
  if a['zoneId']=='turn-4':
   replacement=ROOT/'src/circuits/americas/austin-t4-2026.json'
   if replacement.exists() and z==json.loads(replacement.read_text('utf8'))['zone']:
    if s['rows']!=a['rows']:raise ValueError('Source T4 annual rows changed')
    continue # Independently reviewed new footprint owns its estimated rise.
  if digest({k:s[k] for k in ['boundary','baseHeight','rise']})!=a['physicalFingerprint']:raise ValueError('Revalidate independently edited structure')
  old={'rows':a['oldRows'],'riser':a['oldRiserMetres'],'source':a['oldRowCountSource']}
  new={'rows':a['rows'],'riser':a['rowRiserMetres'],'source':record['source']}
  current={'rows':s['rows'],'riser':s.get('rowRiserMetres'),'source':s.get('rowCountSource')}
  if current not in [old,new]:raise ValueError('Preserve independent row edits')
  s.update(rows=a['rows'],rowRiserMetres=a['rowRiserMetres'],rowCountSource=copy.deepcopy(record['source']))
 return result

if __name__=='__main__':
 p=ROOT/'src/circuits/generated/austin.json'
 record=json.loads((ROOT/'src/circuits/americas/austin-row-facts-2026.json').read_text('utf8'))
 d=apply_facts(json.loads(p.read_text('utf8')),record)
 p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
 print('Applied 6 Austin row facts; physical bounds, total rises and availability retained.')
