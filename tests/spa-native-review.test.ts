import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import source from '../src/circuits/season-review/spa-la-source-2026.json';
import data from '../src/circuits/generated/spa.json';
import inventory from '../src/circuits/season-review/inventory-2026.json';
it('does not merge four dated La Source ticket products into three unnamed buildings',()=>{
 expect(source.annualIdentityEvidence).toMatchObject({capturedAt:'2026-01-14T00:45:29Z',eventStartDate:'2026-07-16',eventEndDate:'2026-07-19'});
 expect(source.annualIdentityEvidence.products.map(p=>p.mapId)).toEqual(['G7','G7-bis','G7-ter','G8']);
 expect(new Set(source.annualIdentityEvidence.products.map(p=>p.productId)).size).toBe(4);
 expect(inventory.find(r=>r.circuitId==='spa')?.confirmedMissingProducts?.map(p=>p.productId)).toEqual([]);
 expect(data.spectatorZones.find(z=>z.zoneId==='gold-7-ter-endurance')?.availability).toBe('available');
 for(const product of source.annualIdentityEvidence.products)expect(product.geographicBoundaryVerified).toBe(false);
});
it('keeps unassociated La Source footprints out of runtime while admitting the scoped Gold7 approximation',()=>{
 expect(source.nativeCandidates.map(c=>c.way)).toEqual([1366085152,1366085153,1366085154]);
 for(const candidate of source.nativeCandidates){
  expect(candidate.annualIdentityVerified).toBe(false);
  expect(candidate.renderedRoadOverlapMetres2).toBeLessThan(1e-6);
  expect(data.spectatorZones.some(z=>JSON.stringify(z.boundary)===JSON.stringify(candidate.boundary))).toBe([1366085152,1366085153,1366085154].includes(candidate.way));
 }
 expect(source.runtimeApplied).toBe(true);expect(source.sceneAccepted).toBe(false);
 expect(source.sourceScope.annualMapVerified).toBe(false);
});
it('ties conflict measurements to the current package and preserves the remaining withheld identities',()=>{
 const current=readFileSync(new URL('../src/circuits/generated/spa.json',import.meta.url));
 expect(createHash('sha256').update(current).digest('hex')).toBe(source.currentPackageSha256);
 expect(source.heldZones.map(z=>z.zoneId)).toEqual(data.spectatorZones.filter(z=>z.availability!=='available').map(z=>z.zoneId));
 expect(source.legacyHeldZones.filter(z=>z.currentRenderedRoadOverlapMetres2>1e-6).map(z=>z.zoneId)).toEqual(['gold-6-chicane','gold-11-chicane','silver-3-double-gauche','silver-4-bruxelles']);
});
