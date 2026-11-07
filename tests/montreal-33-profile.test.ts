import {expect,it} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/americas/montreal-33-2026.json';

it('retains the full official geographic footprint without mistaking road clearance for section acceptance',()=>{
 expect(source.sourceFeatureId).toBe('8df3e7a8-a092-4d92-b533-f037a64f0f88');
 expect(source.sourceBoundary).toHaveLength(58);expect(source.zone.boundary).toEqual(source.sourceBoundary);
 expect(source.roadIntersectionMetres2).toBe(0);expect(source.otherIntersections).toEqual([]);
 const accepted=source.profileReview.metricModelValidated;
 expect(source.profileReview.unresolved).toBe(!accepted);expect(source.profileReview.sameYearSectionVerified).toBe(false);
 expect(source.zone.availability).toBe(accepted?'available':'preparing');
 if(accepted)expect(source).toHaveProperty('sceneAcceptance.accepted',true);else expect('sceneAcceptance' in source).toBe(false);
});
it('reproduces compressed row spacing in the provisional narrow bank using the shared physical geometry',async()=>{
 const d=await loadCircuit('montreal'),candidate=structuredClone(source.zone) as typeof d.spectatorZones[number];candidate.availability='available';
 const old=candidate.surfaces![0];delete old.rowPitch;delete old.rowFrontEdge;old.rows=source.profileReview.provisionalRows;old.rise=source.profileReview.provisionalRiseMetres;old.frontReference=source.profileReview.provisionalFrontReference as [number,number];
 const m=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId===candidate.zoneId?candidate:z)}).spectators,s=m.zoneSurfaces.get(candidate.zoneId)![0];
 const spacing=[.1,.3,.5,.7,.9].map(u=>m.surfacePoint(s,u,.51+1/s.definition.rows).sub(m.surfacePoint(s,u,.51)).setY(0).length());
 expect(Math.min(...spacing)).toBeLessThan(.4);expect(Math.max(...spacing)).toBeGreaterThan(.7);
 expect(source.profileReview.minimumSampleTreadMetres).toBeLessThan(.4);
 expect(source.profileReview.nominalEstimationTreadMetres).toBe(.85);
});
it('keeps the unaccepted prototype out of runtime selection and photography',async()=>{
 const d=await loadCircuit('montreal'),held={...source.zone,availability:'preparing'} as typeof d.spectatorZones[number];
 const rt=createCircuitContext({...d,spectatorZoneIds:d.spectatorZoneIds.filter(id=>id!==held.zoneId),spectatorZones:d.spectatorZones.map(z=>z.zoneId===held.zoneId?held:z)});
 expect(rt.spectators.zoneById('grandstand-33')).toBeUndefined();
 if(source.profileReview.metricModelValidated)expect(d.spectatorZones.find(z=>z.zoneId===held.zoneId)).toEqual(source.zone);
 else expect(d.spectatorZoneIds).not.toContain(held.zoneId);
});
