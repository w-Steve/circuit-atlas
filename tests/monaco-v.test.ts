import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/monaco-v-2026.json';
import visibility from '../src/circuits/season-review/monaco-v-visibility-review.json';
import {createHash} from 'node:crypto';

it('uses V/Noghes source curvature and records the remaining closed-envelope conflict',()=>{
 expect(source.sourcePathIndex).toBe(5587);expect(source.sourceCapStraighteningMaxDeviationPixels).toBeLessThan(.5);
 expect(source.roadWidthMetres).toBe(10);expect(source.roadIntersectionMetres2).toBe(0);
 expect(source.oldCurrentRoadIntersectionMetres2).toBe(0);expect(source.otherIntersections.every(i=>i.availability==='preparing')).toBe(true);expect(source.rocherIntersectionsMetres2).toEqual([0,0,0,0]);
 expect(source.zone.name).toBe('V · 安东尼诺盖弯');expect(source.zone.surfaces[0].baseHeight).toBe(source.oldZone.surfaces[0].baseHeight);
 expect(source.zone.surfaces[0].rows*.85).toBeLessThanOrEqual(source.minimumDepthMetres);
});

it('retains seated foreground occlusion instead of moving the car, eye or steps for a clear photo',async()=>{
 const d=await loadCircuit('monaco');
 expect(visibility.coreInputsSha256).toBe(createHash('sha256').update(JSON.stringify({trackGeometry:d.trackGeometry,corners:d.corners,elevation:d.elevation})).digest('hex'));
 expect(visibility.candidateGeometrySha256).toBe(createHash('sha256').update(JSON.stringify({...source.zone,availability:undefined,geometryReview:undefined})).digest('hex'));
 expect(visibility.exposure.eyeHeightMetres).toBeCloseTo(1.2,8);expect(visibility.intersections).toEqual([]);
 expect(visibility.wheelReferenceRays.flatMap(r=>r.intersections).some(i=>i.object==='v-anthony-noghes-1')).toBe(true);
 expect(source.rocherIntersectionsMetres2).toEqual([0,0,0,0]);expect(source.oldRocherIntersectionsMetres2.reduce((a,b)=>a+b,0)).toBeGreaterThan(1000);
});
it('keeps eighteen V/Noghes seated eyes and default bearings consistent with the shared curved mesh',async()=>{
 const d=await loadCircuit('monaco');if(source.zone.availability==='available')expect(d.spectatorZones.find(z=>z.zoneId==='v-anthony-noghes')).toEqual(source.zone);
 const candidate={...source.zone,availability:'available'} as typeof d.spectatorZones[number];
 const m=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId==='v-anthony-noghes'?candidate:z)}).spectators;
 const s=m.zoneSurfaces.get('v-anthony-noghes')![0],material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
 for(const u of [.05,.2,.4,.6,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.zonePoint('v-anthony-noghes',u,v,false),eye=m.zonePoint('v-anthony-noghes',u,v),pick=m.selectionAt(s,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(m.zonePoint('v-anthony-noghes',pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const front=m.surfacePoint(s,u,0),back=m.surfacePoint(s,u,1),target=m.facingTarget('v-anthony-noghes',u,v);
  expect(front.clone().sub(back).setY(0).normalize().dot(target.clone().sub(floor).setY(0).normalize())).toBeGreaterThan(.5);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
  expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
 }
 mesh.geometry.dispose();material.dispose();
});

