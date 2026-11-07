import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import data from '../src/circuits/generated/lusail.json';
import review from '../src/circuits/asia/lusail-t2-t3-2026.json';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';

it('keeps T2 and T3 distinct and puts seated eyes on their independently paired rows',()=>{
 const zones=[...data.spectatorZones.filter(z=>!['t2','t3'].includes(z.zoneId)),...review.zones];
 const runtime=createCircuitContext({...data,spectatorZones:zones} as unknown as CircuitPackage),model=runtime.spectators;
 for(const id of ['t2','t3']){
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
 expect(review.planarReview.areas.every(a=>a.roadIntersectionMetres2<1e-6&&a.otherIntersections.length===0)).toBe(true);
 expect(review.planarReview.mutualIntersectionMetres2).toBe(0);
 expect(runtime.observer({zoneId:'t2',tier:'lower',u:.5,v:.5}).distanceTo(runtime.observer({zoneId:'t3',tier:'lower',u:.5,v:.5}))).toBeGreaterThan(50);
});
