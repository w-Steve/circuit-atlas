import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import data from '../src/circuits/generated/spielberg.json';
import source from '../src/circuits/europe/spielberg-t3-2026.json';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
it('puts T3 seated points on source-paired treads without endpoint self walls',()=>{
 const runtime=createCircuitContext({...data,spectatorZones:data.spectatorZones.map(z=>z.zoneId==='t3'?source.zone:z)} as unknown as CircuitPackage),model=runtime.spectators,surface=model.zoneSurfaces.get('t3')![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(model.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
 try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+i*.998/20,v=.001+j*.998/20,eye=model.surfacePoint(surface,u,v,true),floor=model.surfacePoint(surface,u,v,false);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(floor.y-runtime.geometry.groundAt(floor.x,floor.z)).toBeGreaterThanOrEqual(0);
  expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.5).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.2,3);
  if((i===0||i===20)&&(j===0||j===10||j===20)){
   const direction=runtime.lookTarget({zoneId:'t3',tier:'lower',u,v}).sub(eye).normalize();
   for(const yaw of [-Math.PI/6,0,Math.PI/6])expect(new Raycaster(eye,direction.clone().applyAxisAngle(new Vector3(0,1,0),yaw),.05,10).intersectObject(mesh)).toHaveLength(0);
  }
 }}finally{mesh.geometry.dispose();material.dispose()}
 expect(source.roadIntersectionMetres2).toBeLessThan(1e-6);expect(source.otherIntersections).toEqual([]);
});
it('verifies the full middle-to-road ray rather than inferring occlusion from foreground appearance',()=>{
 const runtime=createCircuitContext({...data,spectatorZones:data.spectatorZones.map(z=>z.zoneId==='t3'?source.zone:z)} as unknown as CircuitPackage),model=runtime.spectators,surface=model.zoneSurfaces.get('t3')![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(model.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
 try{
  const selection={zoneId:'t3',tier:'lower' as const,u:.52,v:.5},eye=runtime.observer(selection),target=runtime.lookTarget(selection);
  expect(new Raycaster(eye,target.clone().sub(eye).normalize(),.05,eye.distanceTo(target)).intersectObject(mesh).length).toBe(0);
  expect(source.sceneAcceptance.accepted).toBe(true);expect(source.runtimeApplied).toBe(true);
  expect(data.spectatorZones.find(z=>z.zoneId==='t3')).toEqual(source.zone);
 }finally{mesh.geometry.dispose();material.dispose()}
});
