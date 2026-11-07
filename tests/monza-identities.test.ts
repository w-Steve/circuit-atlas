import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/europe/monza-ascari-identity.json';
import inventory from '../src/circuits/season-review/monza-public-inventory.json';

it('retains the original Ascari Tre OSM footprint while displaying the organizer2026 code12 identity',async()=>{
 const d=await loadCircuit('monza'),change=review.changes[0],z=d.spectatorZones.find(z=>z.zoneId===change.zoneId)!;
 expect(z.name).toBe('Ascari 3 · 12');expect(z.ticketCodes).toEqual(['12']);expect(z.source).toEqual(change.previousZone.source);
 expect(z.boundary).toEqual(change.previousZone.boundary);expect(z.surfaces).toEqual(change.previousZone.surfaces);expect(z.surface).toEqual(change.previousZone.surface);
 expect(z.identitySource?.url).toBe('https://www.monzanet.it/en/amex-tickets-draft/');expect(z.identitySource?.notes).toContain('not a surveyed2026');
 expect(review.sources).toHaveLength(2);expect(review.sources.every(s=>s.httpStatus===200&&/^[a-f\d]{64}$/.test(s.sha256))).toBe(true);
});

it('historical and current code12 produce identical metric eyes, directions and pass location on the same terrain',async()=>{
 const d=await loadCircuit('monza'),change=review.changes[0],a=createCircuitContext(d),b=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId===change.zoneId?change.previousZone as typeof z:z)});
 for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
  const s={zoneId:'ascari-tre',tier:'lower' as const,u,v};
  expect(a.observer(s).distanceTo(b.observer(s))).toBe(0);expect(a.lookTarget(s).distanceTo(b.lookTarget(s))).toBe(0);
 }
 expect(a.spectators.zonePassCenter('ascari-tre')).toBe(b.spectators.zonePassCenter('ascari-tre'));
 a.store.getState().chooseZone('ascari-tre');expect(a.store.getState().selection.zoneId).toBe('ascari-tre');
});

it('does not infer all Ascari product identities or annual completeness from matching ordinal names',()=>{
 expect(inventory.ticketProducts).toHaveLength(50);expect(inventory.inventoryComplete).toBe(false);
 const p=inventory.ticketProducts.find(p=>p.code==='12')!;expect(p.modelZones).toEqual(['ascari-tre']);expect(p.candidateModelZones).toEqual([]);
 const expected={'13':['ascari-4-13'],'14':['ascari-2-14'],'17A':['ascari-esterna-17'],'17B':['ascari-esterna-17'],'18':['uscita-ascari-a','uscita-ascari-b']};
 for(const [code,ids] of Object.entries(expected))expect(inventory.ticketProducts.find(p=>p.code===code)!.modelZones).toEqual(ids);
 expect(inventory.ticketProducts.find(p=>p.code==='15')).toBeUndefined();expect(inventory.productsWithoutVerifiedModelAssociation).toHaveLength(0);
 expect(inventory.approximateFamilyCoverageAccepted).toBe(true);
 expect(review.rejectedInferences.map(r=>r.legacyZone)).toEqual(['ascari-uno','ascari-due']);
});
