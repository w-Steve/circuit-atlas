import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import data from '../src/circuits/generated/austin.json';
import facts from '../src/circuits/americas/austin-row-facts-2026.json';
import restored from '../src/circuits/americas/austin-t4-2026.json';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';

it('uses the annual numbered rows while keeping estimated structures and seated eyes',()=>{
 const runtime=createCircuitContext(data as unknown as CircuitPackage),model=runtime.spectators;
 for(const a of facts.areas){
  const zone=data.spectatorZones.find(z=>z.zoneId===a.zoneId)!;
  const definition=zone.surfaces.find(s=>s.surfaceId===a.surfaceId)!;
  expect(definition.rows).toBe(a.rows);expect(definition.baseHeight).toBe(a.retainedBaseHeightMetres);expect(definition.rise).toBe(a.zoneId==='turn-4'?restored.zone.surfaces[0].rise:a.retainedRiseMetres);
  if(zone.availability!=='available'){expect(zone.zoneId).toBe('turn-4');continue}
  const surface=model.zoneSurfaces.get(a.zoneId)!.find(s=>s.definition.surfaceId===a.surfaceId)!;
  const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(model.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
  try{for(let i=0;i<=10;i++)for(let j=0;j<=10;j++){
   const u=.001+i*.998/10,v=.001+j*.998/10,eye=model.surfacePoint(surface,u,v,true),floor=model.surfacePoint(surface,u,v,false);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.5).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.2,3);
  }}finally{mesh.geometry.dispose();material.dispose()}
 }
 expect(data.spectatorZones.find(z=>z.zoneId==='turn-4')!.availability).toBe('available');
});
