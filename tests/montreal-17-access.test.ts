import {expect,it} from 'vitest';
import access from '../src/circuits/americas/montreal-17-access-2026.json';
import identity from '../src/circuits/season-review/montreal-public-map-identity-review.json';
import inventory from '../src/circuits/season-review/inventory-2026.json';

it('distinguishes the annual hospitality bundle from unproven standalone sale and exclusivity',()=>{
 expect(access.season).toBe(2026);
 expect(access.hospitalityBundleConfirmed).toBe(true);
 expect(access.standalonePublicSaleVerified).toBe(false);
 expect(access.hospitalityExclusiveVerified).toBe(false);
 expect(access.evidence.find(e=>e.role==='contest-sponsor-primary-rules-not-race-promoter')?.observedSeason).toBe(2026);
 expect(access.evidence.find(e=>e.role==='former-annual-promoter-sales-link')?.observedSeason).toBe(2027);
});
it('retains the access limits when the independently accepted physical product is modeled',()=>{
 const p=identity.confirmedIdentities.find(p=>p.zoneId===access.productId);
 expect(p).toMatchObject({accessReview:access});
 expect(p?.sourceTenantIds).toContain(access.sourceTenantId);
 const annual=inventory.find(r=>r.circuitId==='montreal');
 expect(annual?.confirmedMissingProducts?.some(p=>p.productId===access.productId)).toBe(false);
 expect(annual?.inventoryComplete).toBe(false);
 expect(access.modelRequired).toBe(true);
});
