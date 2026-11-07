import {it,expect} from 'vitest';
import data from '../src/circuits/generated/austin.json';
import review from '../src/circuits/season-review/austin-t4-runoff-review-2026.json';
import restored from '../src/circuits/americas/austin-t4-2026.json';
it('does not accept the old T4 runoff rectangle merely because the road hit is tiny',()=>{
 const zone=data.spectatorZones.find(z=>z.zoneId==='turn-4')!;
 expect(zone).toEqual(restored.zone);
 expect(zone.boundary).not.toEqual(review.beforeZone.boundary);
 expect(restored.oldZone.boundary).toEqual(review.beforeZone.boundary);
 expect(zone.surfaces[0].rows).toBe(21);
});
