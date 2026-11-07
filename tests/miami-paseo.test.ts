import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
for(const id of ['campus-paseo'])it(`${id}: flat accessible seats support continuous picks at a seated eye without burying the deck`,async()=>{
 const r=createCircuitContext(await loadCircuit('miami')),m=r.spectators,s=m.zoneSurfaces.get(id)![0];
 expect(s.definition.rows).toBe(0);expect(s.definition.rise).toBe(0);
 const mesh=new Mesh(m.surfaceGeometry(s),new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld(true);
 try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+i*.998/20,v=.001+j*.998/20,floor=m.surfacePoint(s,u,v,false),eye=m.surfacePoint(s,u,v,true);
  expect(floor.y-r.geometry.groundAt(floor.x,floor.z)).toBeGreaterThan(0);
  expect(eye.y-floor.y).toBeCloseTo(1.65,8);
  expect(r.observer(r.selectAt(s,floor)).distanceTo(eye)).toBeLessThan(.001);
  expect(new Raycaster(eye,new Vector3(0,-1,0),0,2).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.65,3);
 }}finally{mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose()}
});
