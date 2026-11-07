import {it,expect} from 'vitest';
import review from '../src/circuits/season-review/las-vegas-annual-access-2026.json';
import inventory from '../src/circuits/season-review/inventory-2026.json';
import {loadCircuit} from '../src/circuits/registry';
it('maps both annual standing products to their independent approximate sectors',async()=>{
 const data=await loadCircuit('las-vegas');
 expect(review.season).toBe(2026);expect(review.annualEvidence.eventDates).toEqual(['2026-11-19','2026-11-21']);
 expect(review.confirmedMissingProducts).toEqual([]);
 expect(review.modeledProducts.map(p=>p.productId)).toEqual(['t-mobile-general-admission','flamingo-general-admission']);
 expect(review.modeledProducts.flatMap(p=>p.modelZoneIds)).toEqual(['ga-tmobile-t6','ga-flamingo-koval']);
 expect(data.spectatorZones.filter(z=>z.kind==='grandstand')).toHaveLength(10);
 expect(data.spectatorZones.filter(z=>z.kind!=='grandstand').map(z=>z.zoneId)).toEqual(review.modeledProducts.flatMap(p=>p.modelZoneIds));
 expect(inventory.find(r=>r.circuitId==='las-vegas')?.confirmedMissingProducts).toEqual([]);
 expect(review.practicalCoverageReview.accepted).toBe(true);expect(review.practicalCoverageReview.nativeExcludedWay).toBe(976405284);
 expect(review.runtimeApplied).toBe(true);expect(review.inventoryComplete).toBe(false);expect(review.geographicBoundaryVerified).toBe(false);
});
