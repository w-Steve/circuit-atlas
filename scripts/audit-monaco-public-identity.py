"""Record observed final-map identities; absence from a legend is not closure."""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
source=read('src/circuits/europe/monaco-standing-2026.json')
assert source['circuitId']=='monaco' and source['season']==2026
digest='3d40d544403b11b070e28840079b7117ace6fe6cd2f553ffb8699ac98c3d887d'
assert source['sourceSha256']==digest
assert hashlib.sha256((ROOT/'research/season-review/monaco2026/public-map.jpg').read_bytes()).hexdigest()==digest,'Reinspect changed public artwork'
data=read('src/circuits/generated/monaco.json')
assert data['circuitId']=='monaco' and data['season']==2026
labels={
 'a-sainte-devote':('A','Avenue J.-F. Kennedy'),
 'b-casino':('B','Casino'),
 'k-tabac':('K1–K6','Quai Albert Ier'),
 'l-piscine':('L','Piscine Rainier III'),
 'n-piscine':('N','Virage Panne Nord'),
 'o-piscine':('O','Piscine Plongeur'),
 'p-piscine':('P','Piscine Panne Sud'),
 't-rascasse':('T','Cale de Halage'),
 'v-anthony-noghes':('V','Virage Antony Noghès'),
 'z-quai-kennedy':('Z','Avenue J.-F. Kennedy'),
}
unlisted={'e-chicane':'E','m-piscine':'M','x1-quai-albert':'X1','x2-quai-albert':'X2'}
assert set(labels)|set(unlisted)=={z['zoneId'] for z in data['spectatorZones']},'Reconcile newly added runtime identities'
assert all(z['availability']!='available' for z in data['spectatorZones'] if z['zoneId'] in unlisted),'Unverified annual identity cannot open from an older diagram alone'
report={'circuitId':'monaco','season':2026,'checkedAt':'2026-10-27',
 'sourceUrl':source['sourceUrl'],'sourceSha256':digest,'sourcePublishedAt':source['sourcePublishedAt'],
 'method':'Manually read the TRIBUNES / GRANDSTANDS and Zones debout / Standing areas legends of the fixed 2026 public map. Source image is retained locally, not redistributed.',
 'confirmedIdentities':[{'zoneId':k,'mapLabel':v[0],'officialPlaceName':v[1],'ticketClass':'standing' if k=='z-quai-kennedy' else 'grandstand'} for k,v in labels.items()],
 'unresolvedIdentities':[{'zoneId':k,'mapLabel':v,'finding':'Not listed in final public grandstand legend; absence is not proof of cancellation or hospitality exclusivity.','nextAction':'Obtain dated 2026 organizer ticket inventory or access document explicitly identifying this label.'} for k,v in unlisted.items()],
 'confirmedMissingProducts':[{'productId':'rocher','mapLabel':'Secteur Rocher','ticketClass':'standing','modelZoneId':None,'sourceBoundaryParts':len(next(a for a in source['areas'] if a['productId']=='rocher')['sourceParts']),'nextAction':'Register the four disconnected source pieces as one standing sector using independent geographic controls and terrain; do not extrapolate the road-only registration.'}],
 'inventoryComplete':False,'limits':'Legend confirms labels/classes, not surveyed boundaries, row profiles, single-ticket cross-access or all-seat visibility. No runtime geometry or availability changed.'}
candidatePath='src/circuits/europe/monaco-rocher-world-candidate-2026.json'
if (ROOT/candidatePath).exists():
    candidate=read(candidatePath)
    assert candidate['circuitId']=='monaco' and candidate['season']==2026 and candidate['sourceSha256']==digest
    assert not candidate['sceneAcceptance']['accepted'] and candidate['zone']['availability']=='preparing','Reconcile accepted Rocher with the runtime inventory'
    report['confirmedMissingProducts'][0].update(worldCandidate=candidatePath,candidateAccepted=False,nextAction='Resolve candidate street-centreline intersections and independently verify the control correspondences/grades before terrain and scene acceptance.')
(ROOT/'src/circuits/season-review/monaco-public-map-identity-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print('Monaco: 10 runtime identities listed; 4 identities unproven; Rocher standing product missing')
