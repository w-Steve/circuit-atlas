import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
import review from '../src/circuits/europe/monaco-x-2026.json';
for(const zone of review.zones)it(`keeps ${zone.zoneId} continuous seated picks on its shared bank`,async()=>{
 const data=await loadCircuit('monaco');
 const runtime=createCircuitContext(data as unknown as CircuitPackage);
 const m=runtime.spectators,s=m.zoneSurfaces.get(zone.zoneId)![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
 try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+i*.998/20,v=.001+j*.998/20,eye=m.surfacePoint(s,u,v,true),floor=m.surfacePoint(s,u,v,false);
  expect(eye.y-floor.y).toBeCloseTo(zone.kind==='grandstand'?1.2:1.65,8);
  expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.8).intersectObject(mesh)[0]?.distance).toBeCloseTo(zone.kind==='grandstand'?1.2:1.65,3);
  expect(runtime.observer(m.selectionAt(s,floor)).distanceTo(eye)).toBeLessThan(.03);
 }}finally{mesh.geometry.dispose();material.dispose()}
 expect(zone.source.method).toBe('estimated');
});
