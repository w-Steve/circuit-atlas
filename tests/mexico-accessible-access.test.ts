import {it,expect} from 'vitest';
import review from '../src/circuits/season-review/mexico-public-map-identity-review.json';
import {loadCircuit} from '../src/circuits/registry';
it('keeps the published accessible platform seated and avoids inventing standing GA from ordinary-ticket wording',async()=>{
 const data=await loadCircuit('mexico');
 expect(review.generalAdmissionReview.status).toBe('not-listed-in-2026-public-sale-table');
 expect(review.generalAdmissionReview.unpublishedAbsenceProven).toBe(false);
 expect(review.confirmedIdentities.filter(p=>p.ticketClass==='grandstand')).toHaveLength(18);
 expect(review.confirmedIdentities.filter(p=>p.ticketClass==='accessible-platform').map(p=>p.zoneId)).toEqual(['zona-accesible-azul','zona-accesible-verde']);
 expect(review.generalAdmissionReview.accessiblePlatformCount).toBe(2);
 expect(data.spectatorZones.filter(z=>z.kind!=='grandstand')).toHaveLength(0);
 const z=data.spectatorZones.find(z=>z.zoneId==='zona-accesible-azul')!;
 expect(z.admissionNote).toContain('无障碍专属');expect(z.surfaces[0]).toMatchObject({eyeHeight:1.2,rise:0,rows:1});
 expect(z.openingSource?.url).toBe(review.sourceUrl);
 const green=data.spectatorZones.find(z=>z.zoneId==='zona-accesible-verde')!;
 expect(green.admissionNote).toContain('无障碍专属');
 expect(green.surfaces[0]).toMatchObject({eyeHeight:1.2,rise:0,rows:1});
 expect(green.boundary[0][0]).toBeLessThan(-99.09);
 expect(green.boundary[0][1]).toBeGreaterThan(19.406);
});
it('maps annual tours by day and distinguishes approximate Box models from ordinary admission',()=>{
 const relations=review.annualProductRelations;
 expect(relations.season).toBe(2026);
 expect(relations.tourAssignments).toEqual([
  {product:'Grandstand Tour Gold',friday:'Box Oro Sur',saturday:'Grada 7',sunday:'Grada 4'},
  {product:'Grandstand Tour Platinum',friday:'Grada 4',saturday:'Box Oro Sur',sunday:'Grada 7'},
  {product:'Grandstand Tour Diamond',friday:'Grada 7',saturday:'Grada 4',sunday:'Box Oro Sur'},
 ]);
 expect(relations.remainingBoxLocations).toEqual([]);
 expect(relations.modeledBoxLocations.map(p=>p.modelZoneId)).toEqual(['sky-boxes-grada-1','sky-boxes-grada-11','box-oro-norte','box-oro-sur']);
 expect(review.additionalCoverageQuestions).toEqual([]);
 expect(review.geographicRefinements[0].completionRequired).toBe(false);
});
