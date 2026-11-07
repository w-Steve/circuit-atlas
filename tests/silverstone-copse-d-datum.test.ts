import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import source from '../src/circuits/europe/silverstone-copse-d-datum-2026.json';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {Elevation} from '../src/circuits/types';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';

it('anchors the first-row base at the native track-side edge without changing seating dimensions',async()=>{
 const data=await loadCircuit('silverstone'),zone=data.spectatorZones.find(z=>z.zoneId==='copse-d')!;
 expect(zone.boundary).toEqual(source.sourceBoundary);
 const [a,b]=source.frontEdgeIndices.map(i=>source.sourceBoundary[i]);
 expect(source.groundReference.coordinate).toEqual([(a[0]+b[0])/2,(a[1]+b[1])/2]);
 const original=source.previousSurface,current=zone.surfaces![0];
 expect(current.rowStrip).toEqual(source.rowStrip);expect(current.rowBearing).toBe('local-normal');
 const {groundReference:_,rowStrip:__,rowBearing:___,...preserved}=current;
 expect(preserved).toEqual(original);
 expect(current.baseHeight).toBe(2.2);expect(current.eyeHeight).toBe(1.2);
 // Both front-edge vertices are west of the rear, toward the authored track reference.
 expect(Math.max(a[0],b[0])).toBeLessThan(Math.min(source.sourceBoundary[2][0],source.sourceBoundary[3][0]));
 expect(current.frontReference![0]).toBeLessThan(source.groundReference.coordinate[0]);
});

it('retains full front-to-rear depth and invertible selection at both ends of the skew footprint',async()=>{
 const data=structuredClone(await loadCircuit('silverstone'));
 const zone=data.spectatorZones.find(z=>z.zoneId==='copse-d')!;
 const rt=createCircuitContext(data),model=rt.spectators,surface=model.zoneSurfaces.get('copse-d')![0];
 for(const u of [0,.00001,.1,.5,.9,.99999,1]){
  const front=model.zonePoint('copse-d',u,0,false),back=model.zonePoint('copse-d',u,1,false);
  expect(Math.hypot(back.x-front.x,back.z-front.z)).toBeGreaterThan(14);
  for(const v of [0,.2,.5,.8,1]){
   const point=model.zonePoint('copse-d',u,v),pick=model.selectionAt(surface,point);
   expect(pick.u).toBeCloseTo(u,5);
   // Exact tread edges move 2mm inward to avoid Float32 riser ambiguity.
   expect(Math.abs(pick.v-v)*Math.hypot(back.x-front.x,back.z-front.z)).toBeLessThan(.00201);
   expect(point.y-model.zonePoint('copse-d',u,v,false).y).toBeCloseTo(1.2,8);
  }
 }
 // The ends are source polygon edges, not artificial inset seats or moved geometry.
 const origin=rt.geometry.origin,scale=111320*rt.geometry.calibration;
 for(const [u,v,index] of [[0,0,0],[0,1,3],[1,0,1],[1,1,2]]){
  const p=model.zonePoint('copse-d',u,v,false),q=source.sourceBoundary[index];
  expect(p.x).toBeCloseTo((q[0]-origin[0])*scale*Math.cos(origin[1]*Math.PI/180),3);
  expect(p.z).toBeCloseTo(-(q[1]-origin[1])*scale,3);
 }
 const mesh=new Mesh(model.surfaceGeometry(surface,p=>rt.geometry.groundAt(p.x,p.y)-.15),new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld(true);
 try{
  for(const u of [0,1]){
   const eye=model.zonePoint('copse-d',u,0),forward=model.facingTarget('copse-d',u,0).sub(eye).normalize();
   for(const yaw of [-.35,0,.35]){
    const ray=new Raycaster(eye,forward.clone().applyAxisAngle(new Vector3(0,1,0),yaw),.1,30);
    expect(ray.intersectObject(mesh),`own side blocks front-row end ${u} / ${yaw}`).toHaveLength(0);
   }
  }
 }finally{mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose()}
});

it('keeps all candidate seating samples above uncut DEM with physical seated eyes',async()=>{
 const data=structuredClone(await loadCircuit('silverstone'));
 const ea=JSON.parse(readFileSync('src/circuits/elevation-source/candidates/silverstone-ea-dtm.json','utf8'));
 data.elevation={...data.elevation,grid:ea.grid} as Elevation;
 data.spectatorZones.find(z=>z.zoneId==='copse-d')!.surfaces![0].groundReference=source.groundReference as NonNullable<typeof data.spectatorZones[number]['surfaces']>[number]['groundReference'];
 const rt=createCircuitContext(data);
 for(const z of rt.spectators.spectatorZones.filter(z=>z.kind==='grandstand'))for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+.998*i/20,v=.001+.998*j/20;
  const floor=rt.spectators.zonePoint(z.zoneId,u,v,false),eye=rt.spectators.zonePoint(z.zoneId,u,v,true);
  expect(floor.y-rt.geometry.groundAt(floor.x,floor.z),z.zoneId).toBeGreaterThan(0);
  expect(eye.y-floor.y,z.zoneId).toBeCloseTo(1.2,8);
 }
 // The retained source and runtime must agree after explicit terrain acceptance.
 expect(ea.sceneAcceptance.accepted).toBe(true);expect(ea.runtimeApplied).toBe(true);
 expect(data.elevation.source.url).toBe(ea.source);
});
