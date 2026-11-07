import {expect,it} from 'vitest';
import ga from '../src/circuits/americas/montreal-ga-access-2026.json';
import identity from '../src/circuits/season-review/montreal-public-map-identity-review.json';
import inventory from '../src/circuits/season-review/inventory-2026.json';
import {loadCircuit} from '../src/circuits/registry';
import bands from '../src/circuits/americas/montreal-ga-bands-2026.json';
import remaining from '../src/circuits/americas/montreal-ga-remaining-2026.json';
import t6 from '../src/circuits/americas/montreal-t6-ground-2026.json';

it('separates verified annual GA rights and negative exclusions from reserved seating',()=>{
 expect(ga.evidence.observedSeason).toBe(2026);
 expect(ga.evidence.annualHeader).toBe('May 22-23-24 2026');
 expect(ga.reservedSeatsIncluded).toBe(false);expect(ga.grandstandAdmissionIncluded).toBe(false);
 expect(ga.standingEyeHeightMetres).toBe(1.65);
 expect(ga.publishedExclusionNames).toEqual(['Blue Zone','VIP sections','Senna Zone']);
 const blue=ga.excludedAccessAreas[0];
 expect(blue).toMatchObject({sourceLocationId:111295,sourceFeatureId:'365a7969-26da-4f3d-bab5-d28af1ca353e',role:'negative-exclusion-only',selectable:false});
 expect(blue.boundary).toHaveLength(88);expect(blue.boundary[0]).toEqual(blue.boundary.at(-1));
});
it('does not promote colored access zones, a negative polygon or an unlinked GA tenant into selectable ground',async()=>{
 expect(ga.accessZonesNotViewingBoundaries).toHaveLength(5);
 expect(ga.accessZonesNotViewingBoundaries.every(z=>z.role==='access-zone-not-selectable-viewing-ground')).toBe(true);
 expect(ga.geometryValidated).toBe(false);expect(ga.acceptedViewingBoundaries).toEqual([]);
 expect(ga.runtimeModelZoneIds).toEqual([...bands.zones,...t6.zones,...remaining.zones].map(z=>z.zoneId));
 const data=await loadCircuit('montreal');
 expect(data.spectatorZones.filter(z=>z.kind!=='grandstand').map(z=>z.zoneId)).toEqual(ga.runtimeModelZoneIds);
 for(const z of bands.zones)expect(data.spectatorZones.find(a=>a.zoneId===z.zoneId)).toEqual(z);
 const modeled=identity.modeledProducts.find(p=>p.productId==='general-admission');
 expect(modeled).toMatchObject({geographicBoundaryVerified:false,accessReview:{geometryValidated:false,positiveViewingBoundaryCount:0}});
 expect(modeled?.modelZoneIds).toEqual(ga.runtimeModelZoneIds);
 expect(inventory.find(r=>r.circuitId==='montreal')?.confirmedMissingProducts).toEqual([]);
 expect(inventory.find(r=>r.circuitId==='montreal')?.approximateGroundCoverageAccepted).toBe(true);
 expect(identity.inventoryComplete).toBe(false);
});
