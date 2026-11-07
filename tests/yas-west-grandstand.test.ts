import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
import review from '../src/circuits/asia/yas-west-grandstand-2026.json';
it('keeps the approximate West seated picks on the shared bank',async()=>{
 const data=await loadCircuit('yas-marina');
 const runtime=createCircuitContext(data as unknown as CircuitPackage);
 const m=runtime.spectators,s=m.zoneSurfaces.get('west-grandstand')![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
 try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+i*.998/20,v=.001+j*.998/20,eye=m.surfacePoint(s,u,v,true),floor=m.surfacePoint(s,u,v,false);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);
  expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.3).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.2,3);
  expect(runtime.observer(m.selectionAt(s,floor)).distanceTo(eye)).toBeLessThan(.03);
 }
 expect(review.zone.source.method).toBe('estimated');
 for(const u of [.25,.5,.75]){
  const eye=m.surfacePoint(s,u,.5,true),target=m.facingTarget('west-grandstand',u,.5);
  const hit=new Raycaster(eye,target.clone().sub(eye).normalize(),.01,eye.distanceTo(target)).intersectObject(mesh);
  expect(hit,'Default road bearing must not look through the neighboring L arm').toHaveLength(0);
 }
 }finally{mesh.geometry.dispose();material.dispose()}
});

