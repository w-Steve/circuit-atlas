import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
import review from '../src/circuits/asia/yas-hill-candidate-2026.json';

it('keeps the complete Hill candidate on source terrain with standing eyes and continuous picks',async()=>{
 const data=await loadCircuit('yas-marina');
 const candidate={...data,spectatorZones:[...data.spectatorZones.filter(z=>z.zoneId!=='abu-dhabi-hill'),review.zone],barriers:review.barrierPackage} as unknown as CircuitPackage;
 const runtime=createCircuitContext(candidate),model=runtime.spectators;
 const surface=model.zoneSurfaces.get('abu-dhabi-hill')![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(model.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
 let minimum=Infinity,maximum=-Infinity;
 try{for(let i=0;i<=10;i++)for(let j=0;j<=10;j++){
  const u=.001+i*.998/10,v=.001+j*.998/10;
  const eye=model.surfacePoint(surface,u,v,true),floor=model.surfacePoint(surface,u,v,false);
  expect(eye.y-floor.y).toBeCloseTo(1.65,8);
  expect(new Raycaster(eye,new Vector3(0,-1,0),0,2).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.65,3);
  const selected=model.selectionAt(surface,floor),recovered=runtime.observer(selected);
  expect(recovered.distanceTo(eye)).toBeLessThan(.03);
  expect(runtime.lookTarget(selected).toArray().every(Number.isFinite)).toBe(true);
  minimum=Math.min(minimum,floor.y);maximum=Math.max(maximum,floor.y);
 }}finally{mesh.geometry.dispose();material.dispose()}
 expect(maximum-minimum).toBeGreaterThan(1);
 expect(review.planarScreen.roadOverlapM2).toBe(0);
 expect(review.planarScreen.fenceRoadIntersectionMetres).toBe(0);
 delete candidate.barriers;
 expect(()=>createCircuitContext(candidate)).toThrow('Required spectator barrier geometry unavailable');
},30000);

it('measures source-ground occlusion without moving the Hill eye or target',async()=>{
 const data=await loadCircuit('yas-marina');
 const runtime=createCircuitContext({...data,spectatorZones:[...data.spectatorZones.filter(z=>z.zoneId!=='abu-dhabi-hill'),review.zone],barriers:review.barrierPackage} as unknown as CircuitPackage);
 let blocked=0,all=0,defaultBlocked=false;
 const check=(u:number,v:number)=>{
  const selection={zoneId:'abu-dhabi-hill',tier:'lower' as const,u,v};
  const eye=runtime.observer(selection),target=runtime.lookTarget(selection),n=Math.ceil(eye.distanceTo(target));
  for(let k=1;k<n;k++){
   const p=eye.clone().lerp(target,k/n);
   if(runtime.geometry.groundAt(p.x,p.z)>p.y+.05)return true;
  }return false;
 };
 for(let i=0;i<=10;i++)for(let j=0;j<=10;j++){all++;if(check(.001+i*.998/10,.001+j*.998/10))blocked++}
 defaultBlocked=check(.52,.5);
 console.info(JSON.stringify({hillSourceGroundRays:all,blocked,defaultBlocked,scope:'Source ground only, excludes mesh fences/buildings; no visibility-based point selection.'}));
 expect(defaultBlocked).toBe(true);
 expect(blocked).toBeGreaterThan(0);
});
