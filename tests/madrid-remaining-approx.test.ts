import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/europe/madrid-remaining-approx-2026.json';
for(const z of review.zones)it(`checks all approximate seated surfaces of ${z.zoneId}`,async()=>{
 const runtime=createCircuitContext(await loadCircuit('madrid')),m=runtime.spectators;
 for(const s of m.zoneSurfaces.get(z.zoneId)!){
  const mat=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),mat);mesh.updateMatrixWorld(true);
  try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
   const u=.001+i*.998/20,v=.001+j*.998/20,floor=m.surfacePoint(s,u,v),eye=m.surfacePoint(s,u,v,true);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   expect(runtime.observer(m.selectionAt(s,floor)).distanceTo(eye)).toBeLessThan(.03);
   expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.8).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.2,3);
  }}finally{mesh.geometry.dispose();mat.dispose()}
 }
});
