import {expect,it} from 'vitest';
import review from '../src/circuits/season-review/monaco-public-map-identity-review.json';
import standing from '../src/circuits/europe/monaco-standing-2026.json';
import inventory from '../src/circuits/season-review/inventory-2026.json';
import backlog from '../src/circuits/season-review/backlog-2026.json';
import {loadCircuit} from '../src/circuits/registry';

it('keeps final-map identity evidence separate from geometric availability',async()=>{
 const d=await loadCircuit('monaco');
 expect(review.season).toBe(d.season);expect(review.sourceSha256).toBe(standing.sourceSha256);
 expect([...review.confirmedIdentities,...review.unresolvedIdentities].map(a=>a.zoneId).sort()).toEqual(d.spectatorZones.map(z=>z.zoneId).sort());
 expect(review.unresolvedIdentities).toEqual([]);expect(review.legacyCandidateReview).toContain('monaco-m-name-review-2026');
 for(const a of review.unresolvedIdentities)expect(d.spectatorZones.find(z=>z.zoneId===a.zoneId)?.availability).not.toBe('available');
 expect(review.inventoryComplete).toBe(false);
});
it('keeps the distinct modeled Rocher product separate from Z and preserves unresolved identities',async()=>{
 const d=await loadCircuit('monaco'),r=inventory.find(r=>r.circuitId==='monaco')!,b=backlog.rows.find(r=>r.circuitId==='monaco')!;
 expect(d.spectatorZones.some(z=>z.kind==='general-admission')).toBe(true);
 const product=review.modeledProducts.find(p=>p.productId==='rocher')!,source=standing.areas.find(a=>a.productId==='rocher')!;
 expect(product.productId).toBe('rocher');expect(product.modelZoneId).toBe('rocher');
 expect(product.sourceBoundaryParts).toBe(source.sourceParts.length);expect(product.sourceBoundaryParts).toBe(4);
 expect(d.spectatorZones.some(z=>z.zoneId.includes('rocher'))).toBe(true);
 expect(r.confirmedMissingProducts).toEqual(review.confirmedMissingProducts);expect(b.confirmedMissingProducts).toEqual(review.confirmedMissingProducts);
 expect(r.annualIdentityQuestions).toEqual(review.unresolvedIdentities);expect(b.annualIdentityQuestions).toEqual(review.unresolvedIdentities);
 expect(r.inventoryComplete).toBe(false);
});
