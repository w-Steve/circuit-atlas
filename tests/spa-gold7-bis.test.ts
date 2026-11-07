import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import data from '../src/circuits/generated/spa.json';
import source from '../src/circuits/europe/spa-gold7-bis-2026.json';
import {createCircuitContext} from '../src/app/CircuitContext';
import {spectatorCanopy} from '../src/circuits/spectatorCanopy';
import type {CircuitPackage} from '../src/circuits/types';
it('gives the independently identified uncovered Bis bank continuous seated points without self walls',()=>{
 const runtime=createCircuitContext({...data,barriers:source.barrierLayer,spectatorZones:[...data.spectatorZones.filter(z=>z.zoneId!==source.zone.zoneId),source.zone]} as unknown as CircuitPackage);
 const model=runtime.spectators,surface=model.zoneSurfaces.get(source.zone.zoneId)![0],material=new MeshBasicMaterial({side:DoubleSide}),stand=new Mesh(model.surfaceGeometry(surface),material);stand.updateMatrixWorld(true);
 try{
  expect(spectatorCanopy(surface,model)).toBeNull();expect(source.covered).toBe(false);
  expect(source.evidence.annualPage.ticketName).toContain('Uncovered');
  for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
   const u=.001+i*.998/20,v=.001+j*.998/20,eye=model.surfacePoint(surface,u,v,true),floor=model.surfacePoint(surface,u,v,false);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(floor.y-runtime.geometry.groundAt(floor.x,floor.z)).toBeGreaterThanOrEqual(0);
   expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.5).intersectObject(stand)[0]?.distance).toBeCloseTo(1.2,3);
   if((i===0||i===20)&&(j===0||j===10||j===20)){
    const direction=runtime.lookTarget({zoneId:source.zone.zoneId,tier:'lower',u,v}).sub(eye).normalize();
    for(const yaw of [-Math.PI/6,0,Math.PI/6])expect(new Raycaster(eye,direction.clone().applyAxisAngle(new Vector3(0,1,0),yaw),.05,10).intersectObject(stand),`Bis sidewall ${u}/${v}/${yaw}`).toHaveLength(0);
   }
  }
 }finally{stand.geometry.dispose();material.dispose()}
});
