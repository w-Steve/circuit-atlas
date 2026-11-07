import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {spectatorFence} from '../src/circuits/fenceGeometry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/madrid-inner-world-candidate-2026.json';
import accepted from '../src/circuits/europe/madrid-remaining-approx-2026.json';

it('keeps source uncertainty while using the explicitly accepted approximate GD banks',async()=>{
 const data=await loadCircuit('madrid');
 expect(data.spectatorZoneIds).toContain('monumental-12');
 expect(data.spectatorZones.find(z=>z.zoneId==='monumental-12')).toEqual(accepted.zones.find(z=>z.zoneId==='monumental-12'));
 expect(data.spectatorZones.find(z=>z.zoneId==='monumental-12')!.surfaces).toEqual(source.zone.surfaces);
 expect(source.zone.availability).toBe('preparing');
 expect(new Set(source.surfaceMetrics.map(m=>m.label)).size).toBe(4);
 for(const m of source.surfaceMetrics){expect(m.roadIntersectionMetres2).toBe(0);expect(m.minimumStripTurnMagnitude).toBeGreaterThan(0)}
});

it('maps every GD candidate surface through shared mesh and continuous inverse picking',async()=>{
 const d=await loadCircuit('madrid');
 const candidate={...source.zone,availability:'available'} as typeof d.spectatorZones[number];
 const context=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId===candidate.zoneId?candidate:z)});
 const m=context.spectators;
 const surfaces=m.zoneSurfaces.get('monumental-12')!;
 expect(surfaces).toHaveLength(source.zone.surfaces.length);
 const material=new MeshBasicMaterial({side:DoubleSide});
 for(const s of surfaces){
  const mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  for(const u of [.05,.2,.4,.6,.8,.95])for(const v of [.05,.5,.95]){
   const floor=m.surfacePoint(s,u,v),eye=m.surfacePoint(s,u,v,true),pick=m.selectionAt(s,floor);
   expect(eye.y-floor.y).toBeCloseTo(1.2,7);
   expect(m.zonePoint('monumental-12',pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
   const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
   expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
  }
  for(const [a,b] of spectatorFence(s,m,context.data,context.geometry,context.clearance())){
   // Regression for raster-front row jumps that made tall triangular wire fins.
   expect(Math.abs(a.y-b.y)/Math.max(.01,Math.hypot(a.x-b.x,a.z-b.z))).toBeLessThan(.2);
  }
  mesh.geometry.dispose();
 }
 material.dispose();
});

// Continuous source row strips resolve the previously failing bearing gate.
it('candidate release gate: all GD default bearings must face across the rows',async()=>{
 const d=await loadCircuit('madrid'),candidate={...source.zone,availability:'available'} as typeof d.spectatorZones[number];
 const m=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId===candidate.zoneId?candidate:z)}).spectators;
 for(const s of m.zoneSurfaces.get('monumental-12')!)for(const u of [.05,.2,.4,.6,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.surfacePoint(s,u,v),pick=m.selectionAt(s,floor);
  const front=m.surfacePoint(s,u,0),back=m.surfacePoint(s,u,1),target=m.facingTarget('monumental-12',pick.u,pick.v);
  expect(front.clone().sub(back).setY(0).normalize().dot(target.clone().sub(floor).setY(0).normalize())).toBeGreaterThan(.5);
 }
});
