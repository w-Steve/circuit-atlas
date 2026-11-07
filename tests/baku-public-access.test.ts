import {it,expect} from 'vitest';
import review from '../src/circuits/season-review/baku-annual-access-2026.json';
import {loadCircuit} from '../src/circuits/registry';
it('reconciles every archived ordinary ticket and preserves the C tier and roaming gaps',async()=>{
 const data=await loadCircuit('baku');
 expect(review.annualEvidence.capturedAt).toBe('2026-08-26T08:33:29Z');
 expect(data.spectatorZones.filter(z=>z.kind==='grandstand')).toHaveLength(17);
 const publicGroups=review.annualEvidence.categories.filter(c=>c.category!=='Premium Hospitality');
 expect(publicGroups.flatMap(c=>c.products)).toHaveLength(19);
 expect(new Set(review.modeledProducts.flatMap(p=>p.modelZoneIds))).toEqual(new Set(data.spectatorZones.map(z=>z.zoneId)));
 const premium=review.annualEvidence.categories.find(c=>c.category==='Premium Hospitality')!.products.map(p=>p.slug??p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));
 expect(review.modeledProducts.some(p=>premium.includes(p.productId))).toBe(false);
 expect(review.layerCoverageQuestions).toEqual([]);
 expect(review.layerApproximationReview).toMatchObject({accepted:true,actualTierBoundaryVerified:false});
 expect(data.scene?.regions?.filter(r=>r.zoneId==='absheron-c').map(r=>r.tier)).toEqual(['lower','upper']);
 expect(review.modeledProducts.filter(p=>p.modelZoneIds.includes('absheron-c'))).toHaveLength(2);
 for(const c of publicGroups)for(const p of c.products)expect(p.validDays).toBe(c.category==='General admission'?'Thursday - Saturday':'Wednesday - Saturday');
 expect(review.inventoryComplete).toBe(false);expect(review.geographicBoundaryVerified).toBe(false);
});
