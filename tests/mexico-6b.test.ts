import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import data from '../src/circuits/generated/mexico.json';
import review from '../src/circuits/americas/mexico-6b-2026.json';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';

it('places corrected Mexico6B seated eyes on the paired outside-bank rows',()=>{
 const zones=[...data.spectatorZones.filter(z=>z.zoneId!=='grada-6b'),review.zone];
 const runtime=createCircuitContext({...data,spectatorZones:zones} as unknown as CircuitPackage),model=runtime.spectators;
 for(const id of ['grada-6b']){
  const surface=model.zoneSurfaces.get(id)![0],material=new MeshBasicMaterial({side:DoubleSide});
  const mesh=new Mesh(model.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
  try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
   const u=.001+i*.998/20,v=.001+j*.998/20,eye=model.surfacePoint(surface,u,v,true),floor=model.surfacePoint(surface,u,v,false);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.5).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.2,3);
   const target=runtime.lookTarget({zoneId:id,tier:'lower',u,v});
   expect(target.toArray().every(Number.isFinite)).toBe(true);
   // A front-row viewer should not face through an artificial immediate end wall.
   if(j===0&&(i===0||i===10||i===20))expect(new Raycaster(eye,target.clone().sub(eye).normalize(),.05,3).intersectObject(mesh)).toHaveLength(0);
  }}finally{mesh.geometry.dispose();material.dispose()}
 }
});
