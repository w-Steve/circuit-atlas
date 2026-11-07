import {it,expect} from 'vitest';
import access from '../src/circuits/season-review/hungaroring-ga-access-2026.json';
import {loadCircuit} from '../src/circuits/registry';
it('records every major annual GA sector as usable approximation while retaining boundary uncertainty',async()=>{
 const d=await loadCircuit('hungaroring'),ground=d.spectatorZones.filter(z=>z.kind!=='grandstand');
 expect(access.practicalCoverageReview.accepted).toBe(true);
 expect(access.geographicBoundaryVerified).toBe(false);
 expect(access.confirmedMissingProducts).toEqual([]);
 expect(new Set(access.practicalCoverageReview.sectors.map(a=>a.modelZoneId))).toEqual(new Set(ground.map(z=>z.zoneId)));
 for(const z of ground){expect(z.availability).toBe('available');for(const s of z.surfaces!){expect(s.rows).toBe(0);expect(s.eyeHeight).toBe(1.65);expect(s.terrainFollow).toBe(true)}}
 expect(access.modeledProducts[0].surveyedBoundary).toBe(false);
});
