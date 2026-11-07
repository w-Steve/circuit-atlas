import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
import source from '../src/circuits/americas/montreal-1-2026.json';
import seventeen from '../src/circuits/americas/montreal-17-2026.json';

it('retains all59 official1 points and the rear notch with metre steps from the track-facing edge',()=>{
 expect(source.sourceFeatureId).toBe('d7b58002-f759-4ed9-8e7e-834c70f969b4');
 expect(source.sourceBoundary).toHaveLength(59);
 expect(source.zone.boundary).toEqual(source.sourceBoundary);
 expect(source.zone.surfaces[0].rowFrontEdge.coordinates).toEqual([source.sourceBoundary[36],source.sourceBoundary[37]]);
 expect(source.zone.surfaces[0].rowPitch.treadMetres).toBe(.85);
 expect(source.roadIntersectionMetres2).toBeLessThan(1e-6);
 expect(source.otherIntersections).toEqual([]);
 expect(source.sourceBoundary).toEqual(seventeen.blockingReview.officialGrandstand1.boundary);
 expect(seventeen.blockingReview.officialGrandstand1.intersectionWith17Metres2).toBeLessThan(1e-6);
});
it('puts seated eyes on the actual notched step mesh and faces the straight through continuous picks',async()=>{
 const d=await loadCircuit('montreal'),zone={...source.zone,availability:'available'} as CircuitPackage['spectatorZones'][number];
 const r=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId===zone.zoneId?zone:z)}),m=r.spectators,s=m.zoneSurfaces.get(zone.zoneId)![0];
 const g=m.surfaceGeometry(s,p=>r.geometry.groundAt!(p.x,p.y)-.15),mat=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(g,mat);mesh.updateMatrixWorld(true);
 for(const u of [.05,.2,.5,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.surfacePoint(s,u,v),eye=m.surfacePoint(s,u,v,true),pick=m.selectionAt(s,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,7);
  expect(m.zonePoint(zone.zoneId,pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
  expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
  expect(m.surfacePoint(s,u,0).sub(m.surfacePoint(s,u,1)).setY(0).normalize().dot(m.facingTarget(zone.zoneId,u,v).sub(floor).setY(0).normalize())).toBeGreaterThan(.5);
 }
 // Two narrow reentrant sections at the actual rear-notch transitions must
 // remain empty: metric steps cannot bridge a source gap with a false floor.
 for(const [lon,lat] of [[-73.52330569539926,45.500955944258706],[-73.5233403787203,45.500617188084725]]){
  const x=(lon-r.geometry.origin[0])*111320*Math.cos(r.geometry.origin[1]*Math.PI/180)*r.geometry.calibration,z=-(lat-r.geometry.origin[1])*111320*r.geometry.calibration;
  expect(new Raycaster(new Vector3(x,500,z),new Vector3(0,-1,0)).intersectObject(mesh)).toHaveLength(0);
 }
 g.dispose();mat.dispose();
});
