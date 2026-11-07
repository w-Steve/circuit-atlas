import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import type {CircuitPackage} from '../src/circuits/types';
import {createCircuitContext} from '../src/app/CircuitContext';
import {loadCircuit} from '../src/circuits/registry';
import source from '../src/circuits/americas/montreal-17-2026.json';
import identity from '../src/circuits/season-review/montreal-public-map-identity-review.json';

it('retains the entire official17 footprint and distinguishes the conflicting old1 model from the official1 polygon',()=>{
 expect(source.sourceFeatureId).toBe('11f705b7-e9e6-4c64-971e-962415646e60');
 expect(source.sourceBoundary).toHaveLength(31);
 expect(source.zone.boundary).toEqual(source.sourceBoundary);
 expect(source.zone.surfaces[0].boundary).toEqual(source.sourceBoundary);
 expect(source.roadIntersectionMetres2).toBeLessThan(1e-6);
 expect(source.originalBlockingReview.conflicts).toEqual([{zoneId:'grandstand-1',areaMetres2:expect.any(Number)}]);
 expect(source.originalBlockingReview.conflicts[0].areaMetres2).toBeGreaterThan(150);
 expect(source.blockingReview.conflicts).toEqual([]);
 expect(source.blockingReview.officialGrandstand1.boundary).toHaveLength(59);
 expect(source.blockingReview.officialGrandstand1.intersectionWith17Metres2).toBeLessThan(1e-6);
});
it('supports continuous seated floor/eye positions facing the straight on the candidate mesh',async()=>{
 const d=await loadCircuit('montreal'),zone={...source.zone,availability:'available'} as CircuitPackage['spectatorZones'][number];
 const r=createCircuitContext({...d,spectatorZones:[...d.spectatorZones.filter(z=>z.zoneId!==zone.zoneId),zone]}),m=r.spectators,s=m.zoneSurfaces.get(zone.zoneId)![0];
 const g=m.surfaceGeometry(s,p=>r.geometry.groundAt!(p.x,p.y)-.15),mat=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(g,mat);mesh.updateMatrixWorld(true);
 for(const u of [.05,.2,.5,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.surfacePoint(s,u,v),eye=m.surfacePoint(s,u,v,true),pick=m.selectionAt(s,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,7);
  expect(m.zonePoint(zone.zoneId,pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
  expect(m.surfacePoint(s,u,0).sub(m.surfacePoint(s,u,1)).setY(0).normalize().dot(m.facingTarget(zone.zoneId,u,v).sub(floor).setY(0).normalize())).toBeGreaterThan(.5);
 }
 g.dispose();mat.dispose();
});
it('publishes17 only with its own acceptance and still filters an unaccepted runtime fixture',async()=>{
 expect(source.zone.availability).toBe('available');
 expect(source.sceneAcceptance.accepted).toBe(true);
 expect(source.blockingReview.unresolved).toBe(false);
 const data=await loadCircuit('montreal'),runtime=createCircuitContext(data);
 expect(data.spectatorZones.find(z=>z.zoneId==='grandstand-17')).toEqual(source.zone);
 expect(runtime.spectators.spectatorZones.some(z=>z.zoneId==='grandstand-17')).toBe(true);
 const held=structuredClone(data);held.spectatorZones.find(z=>z.zoneId==='grandstand-17')!.availability='preparing';
 expect(createCircuitContext(held).spectators.spectatorZones.some(z=>z.zoneId==='grandstand-17')).toBe(false);
 expect(identity.confirmedMissingProducts.some(p=>p.productId==='grandstand-17')).toBe(false);
});
