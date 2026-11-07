import {it,expect} from 'vitest';
import review from '../src/circuits/season-review/miami-marina-platform-2026.json';
import data from '../src/circuits/generated/miami.json';
import annual from '../src/circuits/season-review/miami-annual-access-2026.json';
it('links the approximate Marina deck to explicit2026 public viewing evidence without changing geometry or claiming a dated marker survey',()=>{
 const z=data.spectatorZones.find(z=>z.zoneId==='campus-marina')!;
 expect(z.openingSource).toEqual(review.afterZone.openingSource);
 expect(z.openingSource.url).toMatch(/^https:\/\/www.fia.com\//);
 expect(review.pdfPageOneBased).toBe(4);
 expect(review.annualIdentityConfirmed&&review.publicRaceViewingConfirmed).toBe(true);
 expect(review.geographicReference.annualInstallationCertificate).toBe(false);
 expect(z.surfaces).toEqual(review.beforeZone.surfaces);
 expect(z.boundary).toEqual(review.beforeZone.boundary);
 expect(z.kind).toBe('general-admission');
 expect(annual.additionalCoverageQuestions).toHaveLength(0);
 expect(annual.modeledProducts.some(p=>p.modelZoneIds?.includes('campus-paseo'))).toBe(true);
});
