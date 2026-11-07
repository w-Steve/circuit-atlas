import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import data from '../src/circuits/generated/mexico.json';
import review from '../src/circuits/americas/mexico-5a-2026.json';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';

it('places Mexico5A seated eyes on both original faces without filling the aisle',()=>{
 const zones=[...data.spectatorZones.filter(z=>z.zoneId!=='grada-5a'),review.zone];
 const runtime=createCircuitContext({...data,spectatorZones:zones} as unknown as CircuitPackage),model=runtime.spectators;
 for(const id of ['grada-5a']){
  for(const surface of model.zoneSurfaces.get(id)!){const material=new MeshBasicMaterial({side:DoubleSide});
  const mesh=new Mesh(model.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
  try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
   const u=.001+i*.998/20,v=.001+j*.998/20,eye=model.surfacePoint(surface,u,v,true),floor=model.surfacePoint(surface,u,v,false);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.5).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.2,3);
   const pick=model.selectionAt(surface,floor);
   expect(runtime.observer(pick).distanceTo(eye)).toBeLessThan(.03);
   const target=runtime.lookTarget(pick);
   expect(target.toArray().every(Number.isFinite)).toBe(true);
   // A front-row viewer should not face through an artificial immediate end wall.
   if(j===0&&(i===0||i===10||i===20))expect(new Raycaster(eye,target.clone().sub(eye).normalize(),.05,3).intersectObject(mesh)).toHaveLength(0);
  }}finally{mesh.geometry.dispose();material.dispose()}
 }
 }
 const faces=model.zoneSurfaces.get('grada-5a')!;
 expect(faces).toHaveLength(2);
 const corners=faces.map(f=>[0.001,.999].flatMap(u=>[.001,.999].map(v=>model.surfacePoint(f,u,v,false))));
 let closest=[corners[0][0],corners[1][0]],best=Infinity;
 for(const a of corners[0])for(const b of corners[1]){const distance=(a.x-b.x)**2+(a.z-b.z)**2;if(distance<best){best=distance;closest=[a,b]}}
 const gap=closest[0].clone().add(closest[1]).multiplyScalar(.5);gap.y=Math.max(...closest.map(p=>p.y))+50;
 const meshes=faces.map(f=>new Mesh(model.surfaceGeometry(f),new MeshBasicMaterial({side:DoubleSide})));
 try{expect(new Raycaster(gap,new Vector3(0,-1,0),0,100).intersectObjects(meshes)).toHaveLength(0)}finally{for(const mesh of meshes){mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose()}}
});
