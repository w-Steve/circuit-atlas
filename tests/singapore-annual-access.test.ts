import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import review from '../src/circuits/season-review/singapore-annual-access-2026.json';

it('keeps annual named stands distinct and records applied platform subsets separately from full coverage',async()=>{
 const data=await loadCircuit('singapore'),ids=new Set(data.spectatorZones.map(z=>z.zoneId));
 expect(ids.has('pit')).toBe(true);expect(ids.has('turn-2')).toBe(true);
 for(const p of review.confirmedMissingProducts){expect(p.modelZoneId).toBeNull();expect(ids.has(p.productId)).toBe(false)}
 expect(review.confirmedMissingProducts.filter(p=>p.ticketClass==='grandstand')).toHaveLength(0);
 expect(ids.has('chicane-turn-2')).toBe(true);
 expect(ids.has('marina-bay')).toBe(true);
 expect(ids.has('pit-exit')).toBe(true);
 expect(ids.has('raffles')).toBe(true);
 expect(ids.has('republic')).toBe(true);
 expect(review.modeledProducts.find(p=>p.productId==='republic')?.modelZoneId).toBe('republic');
 expect(review.runtimeApplied).toBe(true);expect(review.inventoryComplete).toBe(false);
 expect(review.runtimeCoverage).toBe('approximate-nineteen-platform-groups');
 const modeled=review.modeledProducts.find(p=>p.productId==='walkabout-platforms')!.modelZoneIds!;
 expect(modeled).toHaveLength(19);
 expect(new Set(modeled)).toEqual(new Set(data.spectatorZones.filter(z=>z.kind!=='grandstand').map(z=>z.zoneId)));
 for(const id of modeled)expect(data.spectatorZones.find(z=>z.zoneId===id)?.availability).toBe('available');
});

it('records standing access scopes without treating all amenity ground as grass viewing',()=>{
 expect(review.annualEvidence.walkaboutScope).toMatchObject({premier:['1','2','3','4'],zone4:['4'],viewerPosture:'standing',eyeHeightMetres:1.65});
 expect(review.confirmedMissingProducts).toHaveLength(0);
 expect(review.geographicBoundaryVerified).toBe(false);
});
