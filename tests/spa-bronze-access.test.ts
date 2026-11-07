import {it,expect} from 'vitest';
import review from '../src/circuits/season-review/spa-bronze-access-2026.json';
import {loadCircuit} from '../src/circuits/registry';
it('represents all six annual Bronze sectors while keeping Bruxelles admission separate',async()=>{
 const data=await loadCircuit('spa');
 const zones=data.spectatorZones.filter(z=>z.kind!=='grandstand');
 expect(review.annualEvidence.mapIds).toEqual(['bronze-1','bronze-bruxelles','bronze-3','bronze-4','bronze-5','bronze-6']);
 expect(zones.map(z=>z.zoneId).sort()).toEqual(review.modeledProducts.flatMap(p=>p.modelZoneIds).sort());
 expect(review.modeledProducts.find(p=>p.productId==='zone-bronze')!.modelZoneIds).not.toContain('bronze-bruxelles');
 expect(review.modeledProducts.find(p=>p.productId==='zone-bronze-bruxelles')!.modelZoneIds).toEqual(['bronze-bruxelles']);
 for(const z of zones){expect(z.availability).toBe('available');for(const s of z.surfaces){expect(s.eyeHeight).toBe(1.65);expect(s.terrainFollow).toBe(true);expect(s.rows).toBe(0)}}
 expect(review.geographicBoundaryVerified).toBe(false);expect(review.inventoryComplete).toBe(false);
});
