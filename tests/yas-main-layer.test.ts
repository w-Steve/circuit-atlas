import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/season-review/yas-marina-main-layer-review-2026.json';
import approximation from '../src/circuits/asia/yas-main-2026.json';
import seating from '../src/circuits/season-review/yas-marina-main-seat-layout-2026.json';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';

it('does not expose a whole-building Main bank as the eight-row ordinary seat layer',async()=>{
 const data=await loadCircuit('yas-marina'),main=data.spectatorZones.find(z=>z.zoneId==='main')!;
 expect(main).toEqual(approximation.zone);
 expect(main.boundary).not.toEqual(review.beforeZone.boundary);
 expect(main.surfaces).not.toEqual(review.beforeZone.surfaces);
 expect(main.surfaces).toHaveLength(10);
 expect(main.surfaces!.map(s=>s.rows)).toEqual(seating.sections.map(s=>s.rowCount));
 expect(main.surfaces!.every(s=>s.rise<4&&s.baseHeight===4.2)).toBe(true);
 expect(main.source.method).toBe('estimated');
 expect(review.rowLabels).toEqual(['A','B','C','D','E','F','G','H']);
 const runtime=createCircuitContext(data);
 expect(runtime.spectators.zoneById('main')).toBeDefined();
 expect(runtime.spectators.spectatorZones.map(z=>z.zoneId)).toEqual(expect.arrayContaining(['south','north-west','north-crown','north-east']));
 expect(runtime.observer(runtime.store.getState().selection).toArray().every(Number.isFinite)).toBe(true);
});

it('keeps continuous seated picks and inverse selection on all ten ordinary floors',async()=>{
 const runtime=createCircuitContext(await loadCircuit('yas-marina')),m=runtime.spectators;
 const surfaces=m.zoneSurfaces.get('main')!;
 const material=new MeshBasicMaterial({side:DoubleSide});
 try{for(const s of surfaces){
  const mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
   const u=.001+i*.998/20,v=.001+j*.998/20;
   const eye=m.surfacePoint(s,u,v,true),floor=m.surfacePoint(s,u,v,false);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.3).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.2,3);
   expect(runtime.observer(m.selectionAt(s,floor)).distanceTo(eye)).toBeLessThan(.03);
  }}finally{mesh.geometry.dispose()}
 }}finally{material.dispose()}
 // The narrow M00 endpoint is not stretched to the width of ordinary M03.
 expect(surfaces[0].strip!.segments[0].length/surfaces[3].strip!.segments[0].length).toBeCloseTo(10/68,4);
});
