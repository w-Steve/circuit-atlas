import groundApproximation from '../src/circuits/europe/madrid-c-ground-2026.json';
import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/madrid-c-2026.json';
it('distinguishes the source-labeled C seating and General Admission ground without inventing platform elevations',async()=>{
 const d=await loadCircuit('madrid');expect(source.sourceRoadPixels).toHaveLength(56);expect(source.sourceRoadFitRmsPixels).toBeLessThan(.501);expect(source.inventoryComplete).toBe(false);
 for(const bank of source.banks){
  const z=d.spectatorZones.find(z=>z.zoneId===bank.zone.zoneId)!;expect(z.boundary).toEqual(bank.zone.boundary);expect(bank.roadIntersectionMetres2).toBe(0);expect(bank.otherIntersections).toEqual([]);
 }
 const ground=d.spectatorZones.find(z=>z.zoneId==='ga-c-straight')!;expect(ground.kind).toBe('general-admission');expect(ground.surfaces![0].terrainFollow).toBe(true);expect(ground.surfaces![0].rise).toBe(0);expect(ground.admissionNote).toContain('平台未单独还原');
 expect(d.spectatorZones.find(z=>z.zoneId==='stand-5')!.surfaces![0].rowStrip).toBeDefined();
});
it('shares seated rows and candidate standing terrain meshes with thirty-six reversible eye points',async()=>{
 // Ground is explicitly approximate; source terrain and eye height remain unchanged.
 const d=structuredClone(await loadCircuit('madrid'));
 expect(d.spectatorZones.find(z=>z.zoneId==='ga-c-straight')!.availability).toBe('available');
 expect(d.spectatorZoneIds).toContain('ga-c-straight');
 for(const z of d.spectatorZones)if(source.banks.some(b=>b.zone.zoneId===z.zoneId))z.availability='available';
 const m=createCircuitContext(d).spectators,material=new MeshBasicMaterial({side:DoubleSide});
 for(const bank of source.banks){
  const id=bank.zone.zoneId,s=m.zoneSurfaces.get(id)![0],mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  for(const u of [.05,.2,.4,.6,.8,.95])for(const v of [.05,.5,.95]){
   const floor=m.zonePoint(id,u,v,false),eye=m.zonePoint(id,u,v),pick=m.selectionAt(s,floor);
   expect(eye.y-floor.y).toBeCloseTo(id==='stand-5'?1.2:1.65,8);expect(m.zonePoint(id,pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
   const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
  }
  mesh.geometry.dispose();
 }
 material.dispose();
});

it('opening C ground does not alter physical geometry or seated/standing posture',async()=>{
 const z=(await loadCircuit('madrid')).spectatorZones.find(z=>z.zoneId==='ga-c-straight')!;
 const old=groundApproximation.beforeZones[0];
 expect(z.boundary).toEqual(old.boundary);expect(z.surfaces).toEqual(old.surfaces);expect(z.surface).toEqual(old.surface);
});
