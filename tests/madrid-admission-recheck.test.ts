import {it,expect} from 'vitest';
import data from '../src/circuits/generated/madrid.json';
import review from '../src/circuits/season-review/madrid-admission-recheck-2026.json';
import outer from '../src/circuits/season-review/madrid-public-access-review.json';
import inner from '../src/circuits/season-review/madrid-inner-public-access-review.json';
it('keeps annual ticket allocation uncertain without treating the closed old store as withdrawal or universal admission',()=>{
 expect(review.annualTicketEntry.status).toBe(404);
 expect(review.ordinaryAccessVerified).toBe(false);
 expect(review.wholeBankHospitalityExclusiveVerified).toBe(false);
 for(const area of review.areas){
  const z=data.spectatorZones.find(z=>z.zoneId===area.zoneId)!;
  expect(z.availability).toBe('available');
  expect(z.admissionNote).toMatch(/未核实|待核实/);
  const source=[...outer.areas,...inner.areas].find(a=>a.zoneId===area.zoneId)!;
  expect(source.ordinaryAccessVerified).toBe(false);
  expect(source.wholeBankHospitalityExclusiveVerified).toBe(false);
 }
});
