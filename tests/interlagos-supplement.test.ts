import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
import review from '../src/circuits/americas/interlagos-supplement-2026.json';
for(const zone of review.zones.filter(z=>z.kind==='grandstand'))it(`keeps ${zone.zoneId} continuous seated picks on its shared bank`,async()=>{
 const data=await loadCircuit('interlagos');
 const runtime=createCircuitContext(data as unknown as CircuitPackage);
 const m=runtime.spectators,s=m.zoneSurfaces.get(zone.zoneId)![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
 try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+i*.998/20,v=.001+j*.998/20,eye=m.surfacePoint(s,u,v,true),floor=m.surfacePoint(s,u,v,false);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);
  expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.3).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.2,3);
  expect(runtime.observer(m.selectionAt(s,floor)).distanceTo(eye)).toBeLessThan(.03);
 }}finally{mesh.geometry.dispose();material.dispose()}
 expect(zone.source.method).toBe('estimated');
});

it('keeps partial GA standing at1.65m above its source ground',async()=>{const r=createCircuitContext(await loadCircuit('interlagos'));for(const s of r.spectators.zoneSurfaces.get('heineken-gramado-north')!)for(let i=1;i<10;i++)for(let j=1;j<10;j++){const e=r.spectators.surfacePoint(s,i/10,j/10,true),f=r.spectators.surfacePoint(s,i/10,j/10,false);expect(e.y-f.y).toBeCloseTo(1.65,7);expect(r.observer(r.spectators.selectionAt(s,f)).distanceTo(e)).toBeLessThan(.03);}});

it('keeps Estrela an independent standing platform',async()=>{const r=createCircuitContext(await loadCircuit('interlagos'));for(const s of r.spectators.zoneSurfaces.get('heineken-estrela')!){const e=r.spectators.surfacePoint(s,.5,.5,true),f=r.spectators.surfacePoint(s,.5,.5,false);expect(e.y-f.y).toBeCloseTo(1.65,7);expect(review.zones.find(z=>z.zoneId==='heineken-estrela')!.surfaces[0].baseHeight).toBe(3);expect(s.definition.rows).toBe(0);}});

