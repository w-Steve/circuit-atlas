import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import review from '../src/circuits/season-review/singapore-connaught-source-review-2026.json';

it('does not expose the wrong-side Connaught plan merely by changing road overlap tolerances',async()=>{
 const data=await loadCircuit('singapore'),zone=data.spectatorZones.find(z=>z.zoneId==='connaught')!;
 expect(zone).toEqual(review.approximateZone);
 expect(zone.availability).toBe('available');
 expect(data.spectatorZoneIds).toContain('connaught');
 expect(zone.boundary).not.toEqual(review.beforeZone.boundary);
 expect(zone.surfaces[0].eyeHeight).toBe(1.2);
 expect(review.promoterMap.documentSeason).toBe(2026);
 expect(review.promoterMap.notToScale).toBe(true);
 expect(review.geographicCorrectionApplied).toBe(true);
});
