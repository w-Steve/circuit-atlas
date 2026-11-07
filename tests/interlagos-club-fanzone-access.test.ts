import {it,expect} from 'vitest';
import evidence from '../src/circuits/season-review/interlagos-club-fanzone-access-2026.json';
import identity from '../src/circuits/season-review/interlagos-public-map-identity-review.json';
import {loadCircuit} from '../src/circuits/registry';
it('excludes the annual Fanzone entertainment ticket from simulated track viewpoints',async()=>{
 expect(evidence.season).toBe(2026);expect(evidence.annualEvent.publishedAt).toBe('2026-11-02');
 expect(evidence.fanzone).toMatchObject({directTrackView:false,grandstandAdmissionIncluded:false,runtimeViewpointAllowed:false,viewingMethod:'Large LED screen at event stage'});
 const d=await loadCircuit('interlagos');
 expect(d.spectatorZones.some(z=>z.zoneId==='f1-fanzone'||/fanzone/i.test(z.name))).toBe(false);
 expect(identity.excludedNonViewingProducts[0].productId).toBe('f1-fanzone');
});
it('keeps the real VIP viewing product and unlocated sector names distinct from Fanzone access',()=>{
 expect(evidence.grandPrixClub).toMatchObject({annualPresenceConfirmed:true,directTrackView:true,geographicBoundaryVerified:false,viewpointModeled:true});
 expect(evidence.unlocatedSectorNames.names).toEqual(['N','K']);
 expect(identity.additionalCoverageQuestions).toEqual([]);
 expect(evidence.unlocatedSectorNames.resolution).toMatchObject({approximateViewpointsModeled:true,final2026InstallationVerified:false,modelZoneIds:['setor-n','setor-k']});
 expect(identity.confirmedMissingProducts.some(p=>p.productId==='grand-prix-club')).toBe(false);
 expect(identity.modeledProducts.find(p=>p.productId==='grand-prix-club')?.modelZoneIds).toEqual(['grand-prix-club']);
});
