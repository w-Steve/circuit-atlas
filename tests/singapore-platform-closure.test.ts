import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/asia/singapore-platform-closure-2026.json';
for(const zone of review.zones)it(`keeps ${zone.zoneId} standing on every source-ground patch`,async()=>{
 const data=await loadCircuit('singapore'),runtime=createCircuitContext(data),m=runtime.spectators;
 const surfaces=m.zoneSurfaces.get(zone.zoneId)!;
 expect(surfaces.length).toBe(zone.surfaces.length);
 for(const s of surfaces){
  const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
   const u=.001+i*.998/20,v=.001+j*.998/20,eye=m.surfacePoint(s,u,v,true),floor=m.surfacePoint(s,u,v,false);
   expect(eye.y-floor.y).toBeCloseTo(1.65,8);
   expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.8).intersectObject(mesh)[0]?.distance,JSON.stringify({surface:s.definition.surfaceId,u,v,eye:eye.toArray()})).toBeCloseTo(1.65,3);
   expect(runtime.observer(m.selectionAt(s,floor)).distanceTo(eye)).toBeLessThan(.03);
  }}finally{mesh.geometry.dispose();material.dispose()}
 }
 expect(zone.source.method).toBe('estimated');
});

it('keeps bridge-side platforms fixed above the registered reservoir, with road-referenced datum',async()=>{
 const data=await loadCircuit('singapore'),runtime=createCircuitContext(data);
 for(const id of ['walkabout-jubilee','walkabout-connaught-west']){
  const zone=review.zones.find(z=>z.zoneId===id)!;
  expect(zone.surfaces[0].groundReference).toBeDefined();
  const surface=runtime.spectators.zoneSurfaces.get(id)![0];
  const floor=runtime.spectators.surfacePoint(surface,.5,.5,false);
  expect(floor.y).toBeGreaterThan(1.249);
 }
});
