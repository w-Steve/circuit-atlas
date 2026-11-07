import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/americas/austin-main-tiers-2026.json';
import type {Selection} from '../src/store';

it('offers all four promoter products, including both Trackside ends, with independent continuous seated picks',async()=>{
 const d=await loadCircuit('austin'),r=createCircuitContext(d),m=r.spectators;
 const zone=d.spectatorZones.find(z=>z.zoneId==='main')!;
 expect(zone.boundary).toEqual(review.beforeZones[0].boundary);
 expect(zone.surfaces).toHaveLength(5);
 const heights=new Map<string,number>();
 for(const s of m.zoneSurfaces.get('main')!){
  const tier=s.definition.tier!;
  r.store.getState().select({zoneId:'main',tier,u:.5,v:.5});
  const mesh=new Mesh(m.surfaceGeometry(s),new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld(true);
  try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
   const u=.001+i*.998/20,v=.001+j*.998/20,floor=m.surfacePoint(s,u,v,false),eye=m.surfacePoint(s,u,v,true);
   const pick=r.selectAt(s,floor);
   expect(pick.tier).toBe(tier);
   expect(r.observer(pick).distanceTo(eye)).toBeLessThan(.001);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.5).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.2,3);
  }}finally{mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose()}
  heights.set(tier,r.observer({zoneId:'main',tier,u:.5,v:.5}).y);
 }
 expect(heights.get('upper')!-heights.get('lower')!).toBeGreaterThan(3);
 expect(heights.get('platinum')!-heights.get('upper')!).toBeGreaterThan(3);
 const eye=(tier:Selection['tier'])=>r.observer({zoneId:'main',tier,u:.5,v:.5});
 expect(eye('trackside-t1').distanceTo(eye('trackside-t20'))).toBeGreaterThan(200);
 expect(zone.supportToTerrain).toBe(false); // Upper balconies cannot be solid walls through lower seats.
});
