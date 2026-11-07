import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import data from '../src/circuits/generated/spa.json';
import source from '../src/circuits/europe/spa-gold8-2026.json';
import {createCircuitContext} from '../src/app/CircuitContext';
import {spectatorCanopy} from '../src/circuits/spectatorCanopy';
import type {CircuitPackage} from '../src/circuits/types';
import {loadCircuit} from '../src/circuits/registry';
it('loads both reviewed La Source stands without duplicating their shared barriers',async()=>{
 const data=await loadCircuit('spa');expect(data.spectatorZones.find(z=>z.zoneId===source.zone.zoneId)).toEqual(source.zone);
 expect(data.spectatorZoneIds).toContain(source.zone.zoneId);expect(data.barriers?.barriers).toHaveLength(4);
 expect(source.sceneAcceptance.accepted).toBe(true);expect(source.zone.openingSource.url).toContain('20260114');
});
it('keeps Gold8 eyes on its actual steps with source-facing geometry and overhead cover',()=>{
 const runtime=createCircuitContext({...data,barriers:source.barrierLayer,spectatorZones:data.spectatorZones.map(z=>z.zoneId===source.zone.zoneId?source.zone:z)} as unknown as CircuitPackage);
 const model=runtime.spectators,surface=model.zoneSurfaces.get(source.zone.zoneId)![0],canopy=spectatorCanopy(surface,model)!;
 const material=new MeshBasicMaterial({side:DoubleSide}),stand=new Mesh(model.surfaceGeometry(surface),material),roof=new Mesh(canopy.roof,material);
 stand.updateMatrixWorld(true);roof.updateMatrixWorld(true);
 try{
  for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
   const u=.001+i*.998/20,v=.001+j*.998/20,eye=model.surfacePoint(surface,u,v,true),floor=model.surfacePoint(surface,u,v,false);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(floor.y-runtime.geometry.groundAt(floor.x,floor.z)).toBeGreaterThanOrEqual(0);
   expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.5).intersectObject(stand)[0]?.distance).toBeCloseTo(1.2,3);
   expect(new Raycaster(eye,new Vector3(0,1,0),0,30).intersectObject(roof)[0]?.distance).toBeGreaterThan(1);
   if((i===0||i===20)&&(j===0||j===10||j===20)){
    const direction=runtime.lookTarget({zoneId:source.zone.zoneId,tier:'lower',u,v}).sub(eye).normalize();
    for(const yaw of [-Math.PI/6,0,Math.PI/6])expect(new Raycaster(eye,direction.clone().applyAxisAngle(new Vector3(0,1,0),yaw),.05,10).intersectObject(stand),`Gold8 sidewall ${u}/${v}/${yaw}`).toHaveLength(0);
   }
  }
  expect(surface.definition).toMatchObject({rows:19,rise:9.6,eyeHeight:1.2,fenceMode:'authored'});
  expect(source.zone.surfaces[0].baseHeight).toBe(2.2);
  expect(source.nativeStandWay).toBe(1366085153);
 }finally{stand.geometry.dispose();canopy.roof.dispose();canopy.posts.dispose();material.dispose()}
});
