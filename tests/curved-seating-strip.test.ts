import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector2,Vector3} from 'three';
import {createSeatingStrip} from '../src/circuits/seatingStrip';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/asia/melbourne-stands-2026.json';

it('inverts a bent variable-width strip and agrees at paired seams',()=>{
 const front=[new Vector2(0,0),new Vector2(10,0),new Vector2(20,5)],back=[new Vector2(-1,8),new Vector2(9,10),new Vector2(15,15)];
 const strip=createSeatingStrip(front,back,[...front,...[...back].reverse()]);
 for(const u of [0,.001,.2,.5,.8,.999,1])for(const v of [0,.01,.4,.99,1]){
  const pick=strip.inverse(strip.at(u,v));expect(pick.u).toBeCloseTo(u,7);expect(pick.v).toBeCloseTo(v,7);
 }
 for(const v of [0,.2,.7,1])expect(strip.point(0,1,v).distanceTo(strip.point(1,0,v))).toBeLessThan(1e-10);
 expect(()=>createSeatingStrip(front,back.slice(1),front)).toThrow();
 expect(()=>strip.inverse(new Vector2(100,100))).toThrow();
 const clamped=strip.inverse(new Vector2(100,100),true);expect(clamped.u).toBeGreaterThanOrEqual(0);expect(clamped.u).toBeLessThanOrEqual(1);expect(clamped.v).toBeGreaterThanOrEqual(0);expect(clamped.v).toBeLessThanOrEqual(1);
});

it('retains the accepted footprints, profiles and shared source datum of Senna and Prost',async()=>{
 const d=await loadCircuit('melbourne');
 for(const old of source.curvedRowMigration.previousAcceptedZones){
  const zone=d.spectatorZones.find(z=>z.zoneId===old.zoneId)!;
  expect(zone.boundary).toEqual(old.boundary);expect(zone.surface).toEqual(old.surface);
  const {rowStrip,...rest}=zone.surfaces![0];expect(rest).toEqual(old.surfaces[0]);expect(rowStrip).toBeDefined();
 }
});

it('keeps curved-row eyes on rendered treads, with reversible continuous selection and outward default bearings',async()=>{
 const r=createCircuitContext(await loadCircuit('melbourne')),m=r.spectators,material=new MeshBasicMaterial({side:DoubleSide});
 for(const id of ['senna','prost']){
  const s=m.zoneSurfaces.get(id)![0],mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  for(const u of [.01,.05,.25,.5,.75,.95,.99])for(const v of [.05,.5,.95]){
   const floor=m.surfacePoint(s,u,v),eye=m.zonePoint(id,u,v),pick=m.selectionAt(s,floor);
   expect(pick.u).toBeCloseTo(u,7);expect(m.zonePoint(id,pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-6);expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
   expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
  }
  mesh.geometry.dispose();
 }
 // These were the two failing end slices in the old PCA section model.
 const s=m.zoneSurfaces.get('prost')![0];
 for(const u of [.05,.95]){
  const a=m.surfacePoint(s,u-.0001,.05),b=m.surfacePoint(s,u+.0001,.05),eye=m.zonePoint('prost',u,.05),target=m.facingTarget('prost',u,.05);
  const row=new Vector2(b.x-a.x,b.z-a.z).normalize(),direction=new Vector2(target.x-eye.x,target.z-eye.z).normalize();
  expect(Math.abs(row.dot(direction))).toBeLessThan(1e-6);
 }
 material.dispose();
});
