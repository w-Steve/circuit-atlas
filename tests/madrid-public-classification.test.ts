import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import withdrawn from '../src/circuits/season-review/madrid-withdrawn-public-models.json';
import inventory from '../src/circuits/season-review/inventory-2026.json';
import access from '../src/circuits/season-review/madrid-public-access-review.json';
import innerAccess from '../src/circuits/season-review/madrid-inner-public-access-review.json';
it('keeps withdrawn public misinterpretations recoverable and separate from ordinary modeled inventory',async()=>{
 const d=await loadCircuit('madrid'),r=inventory.find(r=>r.circuitId==='madrid')!;
 const ids=d.spectatorZones.map(z=>z.zoneId);
 expect(r.withdrawnPublicModelCount).toBe(withdrawn.withdrawn.length);
 for(const entry of withdrawn.withdrawn){
  expect(ids).not.toContain(entry.zoneId);expect(r.areas.some(a=>a.zoneId===entry.zoneId)).toBe(false);
  expect(entry.originalZone.availability).toBe('preparing');expect(entry.originalZone.surfaces[0].boundary).toEqual(entry.originalZone.boundary);
 }
 expect(r.modeledAvailableCount).toBe(d.spectatorZones.filter(z=>z.availability==='available').length);
 expect(r.withheldCount+r.modeledAvailableCount).toBe(d.spectatorZones.length);
 expect(r.inventoryComplete).toBe(false);
});

it('does not turn a verified 2026 hospitality product or a 2027 page into ordinary GE23 access',async()=>{
 const d=await loadCircuit('madrid'),r=inventory.find(r=>r.circuitId==='madrid')!;
 expect(access.sources.historicProduct.cdxDigestMatchesReplay).toBe(true);expect(access.sources.liveProduct.year).toBe(2027);
 const q=access.areas[0];expect(q.hospitalityProductConfirmed2026).toBe(true);expect(q.ordinaryAccessVerified).toBe(false);expect(q.wholeBankHospitalityExclusiveVerified).toBe(false);
 expect(r.publicAccessQuestions!.map(q=>q.mapLabel)).toEqual(['GE23','GD12','GD11']);
 expect(innerAccess.sources.historicMirador.cdxDigestMatchesReplay).toBe(true);
 const inner=innerAccess.areas[0];expect(inner.ordinaryAccessVerified).toBe(false);expect(inner.wholeBankHospitalityExclusiveVerified).toBe(false);
 expect(d.spectatorZones.find(z=>z.zoneId===inner.zoneId)!.availability).toBe('available');expect(d.spectatorZoneIds).toContain(inner.zoneId);
 expect(inner.approximateExperienceAccepted).toBe(true);
 expect(d.spectatorZones.find(z=>z.zoneId===inner.zoneId)!.admissionNote).toContain('准入未核实');
 expect(new Set(r.publicAccessQuestions!.map(q=>q.sourceReview)).size).toBe(2);
 expect(d.spectatorZones.find(z=>z.zoneId===q.zoneId)!.availability).toBe('available');expect(d.spectatorZoneIds).toContain(q.zoneId);
 expect(q.approximateExperienceAccepted).toBe(true);
 expect(d.spectatorZones.find(z=>z.zoneId===q.zoneId)!.admissionNote).toContain('准入未核实');
});

it('retains GD12 follow-up while accepting only the rebuilt GE1–GE3 association',async()=>{
 const entry=withdrawn.withdrawn.find(x=>x.zoneId==='t9t10')!;
 expect(entry.classification).toBe('unsupported-public-grandstand-footprint');
 expect(entry.originalZone.geometryReview.issues.some(x=>x.includes('road intersection'))).toBe(true);
 const r=inventory.find(r=>r.circuitId==='madrid')!;
 expect(r.withdrawalFollowupCount).toBe(1);expect(r.withdrawalFollowups!.map(x=>x.venueLabel)).toEqual(['GD12']);
 expect(r.resolvedWithdrawalFollowupCount).toBe(1);expect(r.resolvedWithdrawalFollowups![0].venueLabel).toBe('GE1–GE3');
 const d=await loadCircuit('madrid'),z=d.spectatorZones.find(z=>z.zoneId===r.resolvedWithdrawalFollowups![0].modelZoneId)!;
 expect(z.name).toBe('GE1–GE3 看台');expect(z.availability).toBe('available');expect(z.surfaces![0].rowBearing).toBe('local-normal');
 expect(r.inventoryComplete).toBe(false);
});
