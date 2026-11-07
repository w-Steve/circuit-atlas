import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/monaco-k-2026.json';

it('uses K1–K6 source curvature without road or other-region intersections',()=>{
 expect(source.sourcePathIndex).toBe(5592);expect(source.sourceCapStraighteningMaxDeviationPixels).toBeLessThan(.5);
 expect(source.roadWidthMetres).toBe(10);expect(source.roadIntersectionMetres2).toBe(0);
 expect(source.oldCurrentRoadIntersectionMetres2).toBeGreaterThan(0);expect(source.otherIntersections).toEqual([]);
 expect(source.zone.name).toBe('K1–K6 · 阿尔贝一世码头');expect(source.zone.surfaces[0].baseHeight).toBe(source.oldZone.surfaces[0].baseHeight);
 expect(source.zone.surfaces[0].rows*.85).toBeLessThanOrEqual(source.minimumDepthMetres);
});
it('keeps eighteen K1–K6 seated eyes and default bearings consistent with the shared curved mesh',async()=>{
 const d=await loadCircuit('monaco');if(source.zone.availability==='available')expect(d.spectatorZones.find(z=>z.zoneId==='k-tabac')).toEqual(source.zone);
 const candidate={...source.zone,availability:'available'} as typeof d.spectatorZones[number];
 const m=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId==='k-tabac'?candidate:z)}).spectators;
 const s=m.zoneSurfaces.get('k-tabac')![0],material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
 for(const u of [.05,.2,.4,.6,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.zonePoint('k-tabac',u,v,false),eye=m.zonePoint('k-tabac',u,v),pick=m.selectionAt(s,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(m.zonePoint('k-tabac',pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const front=m.surfacePoint(s,u,0),back=m.surfacePoint(s,u,1),target=m.facingTarget('k-tabac',u,v);
  expect(front.clone().sub(back).setY(0).normalize().dot(target.clone().sub(floor).setY(0).normalize())).toBeGreaterThan(.5);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
  expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
 }
 mesh.geometry.dispose();material.dispose();
});

