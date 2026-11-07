import plus from '../src/circuits/europe/silverstone-ga-plus-2026.json';
import {expect,it} from 'vitest';
import source from '../src/circuits/season-review/silverstone-ga-access-2026.json';
import inventory from '../src/circuits/season-review/inventory-2026.json';
import backlog from '../src/circuits/season-review/backlog-2026.json';
import {loadCircuit} from '../src/circuits/registry';
import brooklands from '../src/circuits/season-review/silverstone-brooklands-ga-2026.json';
it('keeps the Brooklands bank and platform access evidence separate from accepted geography',()=>{
 expect(brooklands.ordinaryGA).toMatchObject({drawingIndex:39,positiveLocationVerified:true,geographicTicketBoundaryVerified:false});
 expect(brooklands.fenceConflict).toMatchObject({way:804928144,publicSideIdentified:false});
 expect(brooklands.fenceConflict.interiorCrossingMetres).toBeGreaterThan(10);
 expect(brooklands.platform65.annualAccessEvidence).toMatchObject({season:2026,ordinaryGAAccessDays:['Friday','Saturday'],sundayOrdinaryGAAccessVerified:false,geographicFootprintProvided:false,platformHeightProvided:false});
 expect(brooklands.platform65.geographicBoundaryVerified).toBe(false);
 expect(brooklands.runtimeApplied).toBe(false);expect(brooklands.sceneAccepted).toBe(false);
 expect(inventory.find(r=>r.circuitId==='silverstone')?.standingGeometryReview).toContain('silverstone-brooklands-ga-2026.json');
 expect(backlog.rows.find(r=>r.circuitId==='silverstone')?.nextAction).toContain('外侧GA带39已定位');
});
it('distinguishes positive ordinary-GA bands from same-color auxiliary paths and reserved ticket locations',()=>{
 expect(source.ordinaryGA.annualAdmissionVerified).toBe(true);
 expect(source.ordinaryGA.grandstandAdmissionIncluded).toBe(false);
 expect(source.ordinaryGA.cartographicBandGroups.map(p=>p.drawingIndex)).toEqual([37,38,39,40,41]);
 expect(source.ordinaryGA.excludedSameColorAuxiliaryPathIndices).toEqual([92,93]);
 for(const p of source.ordinaryGA.cartographicBandGroups){expect(p.strokeWidthPdfPoints).toBe(7);expect(p.coordinateSpace).toContain('not longitude');expect(p.sourcePathSha256).toMatch(/^[a-f0-9]{64}$/)}
 expect(source.gaPlus.requiresSpecificReservedArea).toBe(true);
 expect(source.gaPlus.locations.map(p=>p.mapNumber)).toEqual([42,44,45,46,66]);
 expect(source.modeledAccessibleProducts[0].mapNumber).toBe(43);
});
it('keeps admission evidence separate from missing geography and runtime simulation',async()=>{
 expect(source.runtimeApplied).toBe(true);expect(source.ordinaryGA.geographicBoundaryVerified).toBe(false);
 expect(source.nativeFarmCrosscheck.boundaryClosed).toBe(false);
 expect(source.nativeFarmCrosscheck).toMatchObject({nativeGraphConnected:true,modeledEnvelopeClosed:true});
 expect(source.previousNativeFarmCrosscheck.boundaryClosed).toBe(false);
 expect(source.nativeValeCrosscheck).toMatchObject({runtimeGAAdded:true,fullNativeGroundGranted:false,modeledSubsetZoneId:'ga-vale'});
 expect(source.ordinaryGA.partiallyModeledMapBandIndices).toEqual([37,38,39,40,41]);
 expect(source.ordinaryGA.remainingMapBandIndices).toEqual([]);
 expect(source.partialStandingProducts[0]).toMatchObject({productId:'general-admission',complete:false,modeledDrawingIndices:[37,38,39,40,41]});
 expect(source.annualNameQuestions).toEqual([]);expect(source.modeledReservedEnclosures[0]).toMatchObject({formerName:'Copse Yard',modelZoneId:'inside-nine',mapNumber:60,ordinaryGAIncluded:false});
 const data=await loadCircuit('silverstone');expect(data.spectatorZones.filter(z=>z.kind!=='grandstand').map(z=>z.zoneId)).toEqual(['boxpark-hangar','ga-national-pit-straight','ga-vale','ga-farm-curve',...plus.zones.map(z=>z.zoneId),'ga-copse-becketts-hangar','ga-brooklands-luffield','inside-nine']);
 const row=inventory.find(r=>r.circuitId==='silverstone')!;
 expect(row.inventoryComplete).toBe(false);expect(row.confirmedMissingProducts?.map(p=>p.productId)).toEqual([]);
 expect(backlog.rows.find(r=>r.circuitId==='silverstone')?.nextAction).toContain('NPS、Vale和Farm前方已接入');
 expect(backlog.rows.find(r=>r.circuitId==='silverstone')?.geographicSourceGaps).toHaveLength(1);
});
