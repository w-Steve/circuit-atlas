import {it,expect} from 'vitest';
import review from '../src/circuits/season-review/sepang-public-inventory.json';
import ground from '../src/circuits/asia/sepang-hillstands-2026.json';
import {loadCircuit} from '../src/circuits/registry';
it('reconciles all seven annual ordinary families and preserves G eligibility and standing terrain',async()=>{
 const data=await loadCircuit('sepang');
 expect(review.ticketProducts).toHaveLength(7);expect(review.missingPublicProducts).toEqual([]);
 expect(new Set(review.ticketProducts.flatMap(p=>p.modelZoneIds))).toEqual(new Set(data.spectatorZoneIds));
 expect(review.ticketProducts.find(p=>p.name==='G Hillstand')!.eligibility).toContain('MyKad');
 expect(data.spectatorZones.find(z=>z.zoneId==='hill-g')!.admissionNote).toContain('MyKad');
 expect(ground.zones.flatMap(z=>z.surfaces)).toHaveLength(8);
 for(const z of ground.zones)for(const s of z.surfaces)expect(s).toMatchObject({terrainFollow:true,eyeHeight:1.65,rows:0,rise:0});
 expect(data.spectatorZones.some(z=>/^hill-[de]$/.test(z.zoneId))).toBe(false);
 expect(review.inventoryComplete).toBe(true);expect(review.groundCoverageReview.geographicBoundaryVerified).toBe(false);
});
