import {it,expect} from 'vitest';
import review from '../src/circuits/season-review/miami-annual-access-2026.json';
import {loadCircuit} from '../src/circuits/registry';
it('uses public GA map locations while keeping annual continuity and ambiguous pins explicit',async()=>{
 const data=await loadCircuit('miami');
 expect(review.annualEvidence.publishedAt).toBe('2026-04-07');
 expect(review.geographicEvidence.publicCategoryId).toBe(60317);
 expect(review.geographicEvidence.private).toBe(false);
 expect(review.modeledProducts.flatMap(p=>p.modelZoneIds).sort()).toEqual(data.spectatorZones.filter(z=>z.kind!=='grandstand').map(z=>z.zoneId).sort());
 expect(data.spectatorZones.filter(z=>z.kind==='grandstand')).toHaveLength(10);
 expect(review.additionalCoverageQuestions).toHaveLength(0);
 const paseo=data.spectatorZones.find(z=>z.zoneId==='campus-paseo')!;
 expect(paseo.source.notes).toContain('not a deck coordinate');
 expect(paseo.surfaces[0].groundReference!.coordinate[1]).toBeLessThan(25.955725);
 expect(review.geographicRefinements.some(q=>q.zoneId==='campus-paseo'&&!q.completionRequired)).toBe(true);
 for(const p of review.geographicEvidence.locations){const z=data.spectatorZones.find(z=>z.zoneId===p.zoneId)!;expect(z.source.url).toBe(p.sourceUrl);expect(z.source.method).toBe('estimated');expect(z.surfaces.every(s=>s.eyeHeight===1.65&&s.rows===0)).toBe(true)}
 expect(review.geographicBoundaryVerified).toBe(false);expect(review.inventoryComplete).toBe(false);
});
