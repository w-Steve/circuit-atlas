import {it,expect} from 'vitest';
import review from '../src/circuits/season-review/spielberg-public-map-identity-review.json';
import {loadCircuit} from '../src/circuits/registry';
it('covers both ends of the approximate green GA bank without including reserved Schonberg seats',async()=>{
 const d=await loadCircuit('spielberg'),ga=d.spectatorZones.filter(z=>z.kind!=='grandstand');
 expect(review.practicalCoverageReview.accepted).toBe(true);
 expect(new Set(review.practicalCoverageReview.sectors.map(a=>a.modelZoneId))).toEqual(new Set(ga.map(z=>z.zoneId)));
 expect(review.confirmedMissingProducts.some(a=>a.productId==='general-admission')).toBe(false);
 const product=review.modeledProducts.find(a=>a.productId==='general-admission')!;
 expect(product.surveyedBoundary).toBe(false);expect(product.modelZoneIds).not.toContain('schonberg');
 for(const z of ga){expect(z.availability).toBe('available');for(const s of z.surfaces!){expect(s.rows).toBe(0);expect(s.eyeHeight).toBe(1.65);expect(s.terrainFollow).toBe(true)}}
 expect(d.spectatorZones.find(z=>z.zoneId==='schonberg')?.kind).toBe('grandstand');
});
