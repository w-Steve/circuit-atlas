import {expect,it} from 'vitest';
import review from '../src/circuits/europe/silverstone-woodcote-c-review-2026.json';
import approximation from '../src/circuits/europe/silverstone-supplement-2026.json';
import inventory from '../src/circuits/season-review/inventory-2026.json';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
it('keeps the annual name independent from unverified geographic and seating accuracy',()=>{
 expect(review.season).toBe(2026);expect(review.annualIdentityVerified).toBe(true);
 expect(review.namedNativeFootprintFound).toBe(false);
 expect(review.registration.controlWays).not.toContain(review.registration.heldOutWay);
 expect(review.registration.externalErrorMetres).toBeGreaterThan(review.registration.projectedWidthMetres);
 expect(review.geometryAccepted).toBe(false);expect(review.runtimeBoundaryPromoted).toBe(false);
});
it('retains rejected registration evidence while admitting a distinct approximate C without changing valid A/B data',async()=>{
 const data=await loadCircuit('silverstone'),runtime=createCircuitContext(data);
 const c=data.spectatorZones.find(z=>z.zoneId==='woodcote-c')!;
 expect(c).toEqual(approximation.zones.find(z=>z.zoneId==='woodcote-c'));
 expect(approximation.beforeZones.find(z=>z.zoneId==='woodcote-c')?.geometryReview?.issues.some(s=>s.includes('road intersection'))).toBe(true);
 expect(runtime.spectators.spectatorZones.some(z=>z.zoneId==='woodcote-c')).toBe(true);
 expect(runtime.spectators.spectatorZones.some(z=>z.zoneId==='village-a')).toBe(true);
 for(const id of ['woodcote-a','woodcote-b'])expect(runtime.spectators.spectatorZones.some(z=>z.zoneId===id)).toBe(true);
 expect(inventory.find(r=>r.circuitId==='silverstone')?.geometryEvidenceQuestions).toEqual([{zoneId:'woodcote-c',completionRequired:false,sourceReview:'src/circuits/europe/silverstone-woodcote-c-review-2026.json',externalErrorMetres:review.registration.externalErrorMetres,geometryAccepted:false}]);
});
