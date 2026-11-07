import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/monaco-b-2026.json';
import visibility from '../src/circuits/season-review/monaco-b-visibility-review.json';
import {cockpitAt} from '../src/systems/VehicleDynamics';

it('uses B/Casino source curvature without road or other-region intersections',()=>{
 expect(source.sourcePathIndex).toBe(5601);expect(source.sourceCapStraighteningMaxDeviationPixels).toBeLessThan(.5);
 expect(source.roadWidthMetres).toBe(10);expect(source.roadIntersectionMetres2).toBe(0);
 expect(source.oldCurrentRoadIntersectionMetres2).toBe(0);expect(source.otherIntersections).toEqual([]);
 expect(source.zone.name).toBe('B · Casino');expect(source.zone.surfaces[0].baseHeight).toBe(source.oldZone.surfaces[0].baseHeight);
 expect(source.zone.surfaces[0].rows*.85).toBeLessThanOrEqual(source.minimumDepthMetres);
});
it('keeps eighteen B/Casino seated eyes and default bearings consistent with the shared curved mesh',async()=>{
 const d=await loadCircuit('monaco');expect(d.spectatorZoneIds).toContain('b-casino');expect(d.spectatorZones.find(z=>z.zoneId==='b-casino')!.availability).toBe('available');if(source.zone.availability==='available')expect(d.spectatorZones.find(z=>z.zoneId==='b-casino')).toEqual(source.zone);
 const candidate={...source.zone,availability:'available'} as typeof d.spectatorZones[number];
 const m=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId==='b-casino'?candidate:z)}).spectators;
 const s=m.zoneSurfaces.get('b-casino')![0],material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
 for(const u of [.05,.2,.4,.6,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.zonePoint('b-casino',u,v,false),eye=m.zonePoint('b-casino',u,v),pick=m.selectionAt(s,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(m.zonePoint('b-casino',pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const front=m.surfacePoint(s,u,0),back=m.surfacePoint(s,u,1),target=m.facingTarget('b-casino',u,v);
  expect(front.clone().sub(back).setY(0).normalize().dot(target.clone().sub(floor).setY(0).normalize())).toBeGreaterThan(.5);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
  expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
 }
 mesh.geometry.dispose();material.dispose();
});

it('reproduces the saved default ray rather than treating red pixels as scene acceptance',async()=>{
 const d=await loadCircuit('monaco'),candidate={...source.zone,availability:'available'} as typeof d.spectatorZones[number];
 const ctx=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId==='b-casino'?candidate:z)});
 const eye=new Vector3(...visibility.observerPosition as [number,number,number]);
 const target=cockpitAt(visibility.exposure.distance,ctx.geometry),material=new MeshBasicMaterial({side:DoubleSide});
 const mesh=new Mesh(ctx.spectators.surfaceGeometry(ctx.spectators.zoneSurfaces.get('b-casino')![0]),material);mesh.updateMatrixWorld(true);
 try{
  const hit=new Raycaster(eye,target.clone().sub(eye).normalize(),.001,eye.distanceTo(target)-.001).intersectObject(mesh)[0];
  expect(hit).toBeDefined();expect(hit.distance).toBeCloseTo(visibility.intersections[0].distanceMetres,5);
  expect(hit.distance).toBeLessThan(eye.distanceTo(target));expect(visibility.intersections[0].object).toBe('b-casino-1');
 }finally{mesh.geometry.dispose();material.dispose()}
});
