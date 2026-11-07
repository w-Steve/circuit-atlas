import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/europe/spa-annual-supplement-2026.json';
for(const zone of review.zones)it(`keeps ${zone.zoneId} seated on every approximate Spa annual point`,async()=>{
 const data=await loadCircuit('spa'),runtime=createCircuitContext(data),m=runtime.spectators;
 const previous=review.beforeZones.find(z=>z.zoneId===zone.zoneId);
 const addedIds=zone.surfaces.filter(s=>!previous?.surfaces.some(old=>old.surfaceId===s.surfaceId)).map(s=>s.surfaceId);
 const surfaces=m.zoneSurfaces.get(zone.zoneId)!.filter(s=>addedIds.includes(s.definition.surfaceId));
 expect(surfaces.length).toBe(addedIds.length);
 for(const s of surfaces){
  const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
   const u=.001+i*.998/20,v=.001+j*.998/20,eye=m.surfacePoint(s,u,v,true),floor=m.surfacePoint(s,u,v,false);
   expect(eye.y-floor.y).toBeCloseTo(zone.kind==='grass'?1.65:1.2,8);
   expect(floor.y-runtime.geometry.groundAt(floor.x,floor.z)).toBeGreaterThan(.01);
   expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.8).intersectObject(mesh)[0]?.distance,JSON.stringify({surface:s.definition.surfaceId,u,v,eye:eye.toArray()})).toBeCloseTo(zone.kind==='grass'?1.65:1.2,3);
   expect(runtime.observer(m.selectionAt(s,floor)).distanceTo(eye)).toBeLessThan(.03);
  }}finally{mesh.geometry.dispose();material.dispose()}
 }
 expect(zone.availability).toBe('available');
});

for(const association of review.productAssociations.filter(a=>a.productId!=='espace-17-27'))it(`reaches ${association.productId} through the shared continuous zone picker`,async()=>{
 const runtime=createCircuitContext(await loadCircuit('spa')),m=runtime.spectators;
 const surface=m.zoneSurfaces.get(association.zoneId)!.find(s=>s.definition.surfaceId===association.surfaceIds[0])!;
 const eye=runtime.observer({zoneId:association.zoneId,tier:'lower',u:.9,v:.5});
 const mesh=new Mesh(m.surfaceGeometry(surface),new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld(true);
 try{expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.8).intersectObject(mesh)[0]?.distance).toBeCloseTo(association.productId==='zone-verstappen'?1.65:1.2,3)}
 finally{mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose()}
});
