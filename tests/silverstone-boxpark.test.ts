import {expect,it} from 'vitest';
import review from '../src/circuits/europe/silverstone-boxpark-2026.json';
import standing from '../src/circuits/season-review/silverstone-ga-access-2026.json';
import inventory from '../src/circuits/season-review/inventory-2026.json';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';

it('keeps the two annual grandstands and the independent standing terrace as distinct products',()=>{
 expect(review.evidence.eventYear).toBe(2026);
 expect(review.products.map(p=>p.name)).toEqual(['The Loop Grandstand','International Paddock Grandstand','BOXPARK General Admission']);
 expect(review.products[2].role).toBe('dedicated-standing-terrace');
 expect(review.areas.find(a=>a.zoneId==='boxpark-hangar')?.expectedKind).toBe('general-admission');
 expect(review.confirmedMissingProducts).toHaveLength(0);
 expect(review.modeledProducts[0].modelZoneId).toBe('international-paddock-grandstand');
});
it('does not publish a failed diagram registration or misrepresent the GA terrace with the old seated prototype',async()=>{
 expect(review.rejectedRegistration.accepted).toBe(false);
 expect(review.rejectedRegistration.fitRmsMetres).toBeLessThan(4);
 expect(review.rejectedRegistration.heldOutErrorMetres).toBeGreaterThan(30);
 const data=await loadCircuit('silverstone'),runtime=createCircuitContext(data);
 for(const area of review.areas){
  expect(data.spectatorZones.find(z=>z.zoneId===area.zoneId)?.availability).toBe('available');
  expect(runtime.spectators.spectatorZones.some(z=>z.zoneId===area.zoneId)).toBe(true);
 }
 const terrace=data.spectatorZones.find(z=>z.zoneId==='boxpark-hangar')!;
 expect(terrace.kind).toBe('general-admission');expect(terrace.surfaces![0].rows).toBe(0);
 const record=inventory.find(r=>r.circuitId==='silverstone');
 expect(record?.modelRepresentationQuestions).toHaveLength(0);
 expect(record?.confirmedMissingProducts).toEqual([...review.confirmedMissingProducts,...standing.confirmedMissingProducts]);
 expect(record?.inventoryComplete).toBe(false);
});
