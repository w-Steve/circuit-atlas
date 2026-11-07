import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/asia/melbourne-accessible-platforms-2026.json';

it('distinguishes the three sourced accessible platforms from unrestricted Park Pass grass',async()=>{
 const d=await loadCircuit('melbourne');expect(source.sourceEvidence.digestMatches).toBe(true);expect(source.sourceEvidence.sha256).toMatch(/^[a-f\d]{64}$/);
 expect(source.sharedRoadArtworkMaximumDifferencePdfPoints).toBeLessThan(.002);expect(source.areas.map(a=>a.turn)).toEqual([3,4,12]);
 for(const f of source.areas){expect(f.issues).toEqual([]);expect(f.roadClearanceMetres).toBeGreaterThan(1)}
 for(const z of source.zones){
  const actual=d.spectatorZones.find(a=>a.zoneId===z.zoneId)!;expect(actual.boundary).toEqual(z.boundary);
  expect(actual.admissionNote).toContain('无障碍需求');expect(actual.kind).toBe('grandstand');
  expect(actual.surfaces![0].rows).toBe(1);expect(actual.surfaces![0].rise).toBe(0);expect(actual.surfaces![0].eyeHeight).toBe(1.2);
  expect(actual.surfaceSource!.confidence).toBe('low');expect(actual.surfaceSource!.notes).toContain('provisional1m');
 }
 expect(source.excludedNonTracksidePlatforms).toEqual(['Melbourne Walk','Main Stage']);
});

it('keeps seated eyes above flat deck meshes and treats below-deck sightlines as physical intersections',async()=>{
 const r=createCircuitContext(await loadCircuit('melbourne')),m=r.spectators,material=new MeshBasicMaterial({side:DoubleSide});
 for(const z of source.zones){
  const s=m.zoneSurfaces.get(z.zoneId)![0],mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
   const eye=m.zonePoint(z.zoneId,u,v),floor=m.zonePoint(z.zoneId,u,v,false),target=m.facingTarget(z.zoneId,u,v).add(new Vector3(0,.4,0));
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   const down=new Raycaster(eye,new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(down).toBeDefined();expect(down.point.distanceTo(floor)).toBeLessThan(1e-4);
   const distance=eye.distanceTo(target),hit=new Raycaster(eye,target.clone().sub(eye).normalize(),.05,distance-.05).intersectObject(mesh)[0];
   if(hit){
    expect(target.y).toBeLessThan(floor.y);expect(Math.abs(hit.face!.normal.y)).toBeGreaterThan(.999);
    const t=(eye.y-floor.y)/(eye.y-target.y);expect(t).toBeGreaterThan(0);expect(t).toBeLessThan(1);
    expect(hit.point.distanceTo(eye.clone().lerp(target,t))).toBeLessThan(1e-4);
   }
  }
  mesh.geometry.dispose();
 }
 material.dispose();
});
