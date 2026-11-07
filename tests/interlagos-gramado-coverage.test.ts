import {it,expect} from 'vitest';
import review from '../src/circuits/season-review/interlagos-public-map-identity-review.json';
import access from '../src/circuits/season-review/interlagos-gramado-access-2026.json';
import ground from '../src/circuits/americas/interlagos-gramado-interior-2026.json';
import {loadCircuit} from '../src/circuits/registry';
it('adds positive Village-sector ground while preserving separate Estrela admission and source uncertainty',async()=>{
 const data=await loadCircuit('interlagos');
 expect(review.confirmedMissingProducts.some(p=>p.productId==='heineken-gramado')).toBe(false);
 const gramado=review.modeledProducts.find(p=>p.productId==='heineken-gramado')!;
 expect(gramado.modelZoneIds).toEqual(['heineken-gramado-north','gramado-t12','gramado-t13-t14','gramado-interior']);
 expect(gramado.modelZoneIds).not.toContain('heineken-estrela');
 expect(new Set(review.practicalCoverageReview.sectors.map(p=>p.modelZoneId))).toEqual(new Set(data.spectatorZones.filter(z=>z.kind!=='grandstand').map(z=>z.zoneId)));
 expect(access.geographicBoundaryVerified).toBe(false);
 expect(access.nativeGround.decision).toContain('Reject whole-way selection');
 expect(access.positiveLocationEvidence.updatedAt).toContain('2026-03-31');
 expect(ground.zones[0].surfaces).toHaveLength(6);
 expect(ground.zones[0].admissionNote).toContain('18岁以上');
 for(const s of ground.zones[0].surfaces)expect(s).toMatchObject({rows:0,eyeHeight:1.65,terrainFollow:true});
});
