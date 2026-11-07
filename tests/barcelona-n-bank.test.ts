import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import data from '../src/circuits/generated/barcelona.json';
import review from '../src/circuits/europe/barcelona-n-bank-2026.json';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
import {spectatorFence} from '../src/circuits/fenceGeometry';
const candidate=()=>({...data,spectatorZones:[...data.spectatorZones.filter(z=>z.zoneId!=='alonso-land-pelouse'),...review.zones],barriers:review.barrierPackage} as unknown as CircuitPackage);
it('keeps the interpreted N-adjacent bank on shared ground with standing eyes',()=>{
 const runtime=createCircuitContext(candidate()),model=runtime.spectators,surface=model.zoneSurfaces.get('alonso-land-pelouse')![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(model.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
 try{for(let i=0;i<=10;i++)for(let j=0;j<=10;j++){
  const u=.001+i*.998/10,v=.001+j*.998/10,eye=model.surfacePoint(surface,u,v,true),floor=model.surfacePoint(surface,u,v,false);
  expect(eye.y-floor.y).toBeCloseTo(1.65,8);
  expect(new Raycaster(eye,new Vector3(0,-1,0),0,2).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.65,3);
  expect(runtime.lookTarget({zoneId:'alonso-land-pelouse',tier:'lower',u,v}).toArray().every(Number.isFinite)).toBe(true);
 }}finally{mesh.geometry.dispose();material.dispose()}
 expect(review.planarReview.roadIntersectionMetres2).toBeLessThan(1e-6);expect(review.planarReview.otherIntersections).toEqual([]);
 expect(review.planarReview.fullFenceRoadIntersectionMetres).toBeLessThan(1e-6);
 expect(review.barrierPackage.barriers[0].coordinates).toEqual(review.sourceFenceCoordinates);
});
it('refuses a new bank without its complete independently registered fence',()=>{
 const d=candidate();delete d.barriers;expect(()=>createCircuitContext(d)).toThrow('Required spectator barrier geometry unavailable');
});
it('deduplicates estimated fences against independently loaded barrier packages too',()=>{
 const runtime=createCircuitContext(candidate()),surface=runtime.spectators.zoneSurfaces.get('n')![0];
 const plain={...runtime.data,barriers:undefined,facilities:undefined};
 const args=[surface,runtime.spectators] as const,clearance=runtime.clearance();
 const before=spectatorFence(...args,plain,runtime.geometry,clearance);expect(before.length).toBeGreaterThan(0);
 const g=runtime.geometry,geo=(p:Vector3):[number,number]=>[g.origin[0]+p.x/(111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration),g.origin[1]-p.z/(111320*g.calibration)];
 const barrier={...review.barrierPackage.barriers[0],coordinates:before[0].map(geo)};
 const registered=spectatorFence(...args,{...plain,barriers:{circuitId:'barcelona',barriers:[barrier]}},g,clearance);
 const facility=spectatorFence(...args,{...plain,facilities:{circuitId:'barcelona',buildings:[],pitLanes:[],barriers:[barrier],notes:''}},g,clearance);
 expect(registered).toEqual(facility);expect(registered.length).toBeLessThan(before.length);
});
