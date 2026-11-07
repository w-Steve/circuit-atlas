import {expect,it} from 'vitest';
import data from '../src/circuits/generated/spa.json';
import source from '../src/circuits/europe/spa-gold7-candidate.json';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {spectatorCanopy} from '../src/circuits/spectatorCanopy';
import accepted from '../src/circuits/europe/spa-gold7-2026.json';
it('keeps seated eyes below the opaque roof and makes support posts real occluders',()=>{
 const candidate={...data,barriers:{...source.barrierLayer,availability:'available'},spectatorZones:data.spectatorZones.map(z=>z.zoneId===source.zone.zoneId?source.zone:z)} as unknown as CircuitPackage;
 const runtime=createCircuitContext(candidate),surface=runtime.spectators.zoneSurfaces.get(source.zone.zoneId)![0];
 const canopy=spectatorCanopy(surface,runtime.spectators)!;
 const material=new MeshBasicMaterial({side:DoubleSide}),roof=new Mesh(canopy.roof,material),posts=new Mesh(canopy.posts,material);
 roof.updateMatrixWorld(true);posts.updateMatrixWorld(true);
 try{
  expect(canopy.roof.getAttribute('position').count).toBe(96);
  expect(canopy.posts.getAttribute('position').count).toBe(216);
  for(const u of [.001,.1,.5,.9,.999])for(const v of [.001,.1,.5,.9,.999]){
   const eye=runtime.spectators.surfacePoint(surface,u,v,true),floor=runtime.spectators.surfacePoint(surface,u,v,false);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   const hit=new Raycaster(eye,new Vector3(0,1,0),0,30).intersectObject(roof)[0];
   expect(hit,`Missing roof over ${u}/${v}`).toBeDefined();expect(hit.distance).toBeGreaterThan(1);
  }
  const eye=runtime.spectators.surfacePoint(surface,.25,.5,true),post=runtime.spectators.surfacePoint(surface,.5,0,false);post.y=eye.y;
  expect(new Raycaster(eye,post.sub(eye).normalize(),.01,100).intersectObject(posts).length).toBeGreaterThan(0);
  expect(spectatorCanopy({...surface,definition:{...surface.definition,canopy:undefined}},runtime.spectators)).toBeNull();
 }finally{canopy.roof.dispose();canopy.posts.dispose();material.dispose()}
});
it('keeps seated eyes on the actual stepped mesh including front-row ends',()=>{
 const candidate={...data,barriers:{...source.barrierLayer,availability:'available'},spectatorZones:data.spectatorZones.map(z=>z.zoneId===source.zone.zoneId?source.zone:z)} as unknown as CircuitPackage;
 const runtime=createCircuitContext(candidate),m=runtime.spectators,surface=m.zoneSurfaces.get(source.zone.zoneId)![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
 try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+.998*i/20,v=.001+.998*j/20,eye=m.zonePoint(source.zone.zoneId,u,v),floor=m.zonePoint(source.zone.zoneId,u,v,false);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);
  expect(floor.y-runtime.geometry.groundAt!(floor.x,floor.z)).toBeGreaterThanOrEqual(0);
  expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.5).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.2,3);
  if((i===0||i===20)&&(j===0||j===10||j===20)){
   const target=runtime.lookTarget({zoneId:source.zone.zoneId,tier:'lower',u,v}),direction=target.sub(eye).normalize();
   for(const yaw of [-Math.PI/6,0,Math.PI/6])expect(new Raycaster(eye,direction.clone().applyAxisAngle(new Vector3(0,1,0),yaw),.05,10).intersectObject(mesh),`Self-blocked endpoint ${u}/${v}/${yaw}`).toHaveLength(0);
  }
 }}finally{mesh.geometry.dispose();material.dispose()}
});
it('preserves historical candidate evidence and applies only the separately accepted runtime model',()=>{
 expect(source.identityAccepted).toBe(false);expect(source.sceneAcceptance.accepted).toBe(false);expect(source.runtimeApplied).toBe(false);
 expect(data.spectatorZones.find(z=>z.zoneId===source.zone.zoneId)).toEqual(accepted.zone);
 expect(accepted.identityAccepted).toBe(true);expect(accepted.sceneAcceptance.accepted).toBe(true);
 expect(source.zone.surfaces[0]).toMatchObject({rows:21,rise:10.56,baseHeight:2.2,eyeHeight:1.2});
 expect(source.zone.boundary).toEqual(source.sourceBoundary);
 expect(source.roadIntersectionMetres2).toBeLessThan(1e-6);expect(source.otherZoneIntersections).toEqual([]);
 expect(source.barrierLayer.barriers).toHaveLength(4);expect(source.zone.surfaces[0].fenceMode).toBe('authored');
 expect(source.facilityReview.renderedPitOverlapMetres2).toBeLessThan(1e-6);expect(source.facilityReview.buildingPlanOverlapMetres2).toBeLessThan(1e-6);
});
it('refuses a candidate missing any required native barrier',()=>{
 for(const id of source.zone.requiredBarrierIds){
  const candidate={...data,barriers:{...source.barrierLayer,availability:'available',barriers:source.barrierLayer.barriers.filter(b=>b.id!==id)},spectatorZones:data.spectatorZones.map(z=>z.zoneId===source.zone.zoneId?source.zone:z)} as unknown as CircuitPackage;
  expect(()=>createCircuitContext(candidate)).toThrow('Required spectator barrier geometry unavailable');
 }
});
it('constructs the candidate through the shared engine and selects finite seated views across the full surface',()=>{
 const candidate={...data,barriers:{...source.barrierLayer,availability:'available'},spectatorZones:data.spectatorZones.map(z=>z.zoneId===source.zone.zoneId?source.zone:z)} as unknown as CircuitPackage;
 const runtime=createCircuitContext(candidate);
 for(const u of [0,.01,.25,.5,.75,.99,1])for(const v of [0,.01,.25,.5,.75,.99,1]){
  const selection={zoneId:source.zone.zoneId,tier:'lower' as const,u,v};
  expect(runtime.observer(selection).toArray().every(Number.isFinite)).toBe(true);
  expect(runtime.lookTarget(selection).toArray().every(Number.isFinite)).toBe(true);
 }
});
