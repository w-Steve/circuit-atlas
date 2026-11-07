import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
import source from '../src/circuits/americas/montreal-33-2026.json';
type Definition=NonNullable<CircuitPackage['spectatorZones'][number]['surfaces']>[number];
async function model(change?:(s:Definition)=>void){
 const data=await loadCircuit('montreal'),zone=structuredClone(source.zone) as CircuitPackage['spectatorZones'][number];
 zone.availability='available';const s=zone.surfaces![0];
 s.rows=43;s.rise=16.8;s.rowPitch={treadMetres:.85,riserMetres:.4,source:{...zone.source,method:'estimated'}};
 s.rowFrontEdge={coordinates:[source.sourceBoundary[10] as [number,number],source.sourceBoundary[11] as [number,number]],source:zone.source};
 s.frontReference=data.corners.find(c=>c.number===6)!.coordinate;change?.(s);
 const runtime=createCircuitContext({...data,spectatorZones:data.spectatorZones.map(z=>z.zoneId===zone.zoneId?zone:z)});
 return {runtime,surface:runtime.spectators.zoneSurfaces.get(zone.zoneId)![0]};
}
it('keeps metre tread/riser dimensions while shallow and deep banks terminate at different rows',async()=>{
 const {runtime:r,surface:s}=await model(),m=r.spectators,rearHeights:number[]=[];
 for(const u of [.1,.3,.5,.7,.9]){
  const front=m.surfacePoint(s,u,0),back=m.surfacePoint(s,u,1),depth=front.clone().sub(back).setY(0).length();
  const offset=(s.frontDatumN!-front.clone().sub(new Vector3(s.center.x,0,s.center.y)).setY(0).dot(new Vector3(s.normal.x,0,s.normal.y)))*s.frontSign;
  const a=m.surfacePoint(s,u,(2.25*.85-offset)/depth),b=m.surfacePoint(s,u,(3.25*.85-offset)/depth);
  expect(b.clone().sub(a).setY(0).length()).toBeCloseTo(.85,6);expect(b.y-a.y).toBeCloseTo(.4,6);
  rearHeights.push(m.surfacePoint(s,u,.99).y-s.definition.baseHeight);
 }
 expect(Math.min(...rearHeights)).toBeLessThan(7);expect(Math.max(...rearHeights)).toBeGreaterThan(16);
});
it('places seated eyes and exact tread-edge selections on the same clipped physical mesh',async()=>{
 const {runtime:r,surface:s}=await model(),m=r.spectators,g=m.surfaceGeometry(s,p=>r.geometry.groundAt!(p.x,p.y)-.15),mat=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(g,mat);mesh.updateMatrixWorld(true);
 for(const u of [.05,.25,.5,.75,.95]){
  const front=m.surfacePoint(s,u,0),depth=front.clone().sub(m.surfacePoint(s,u,1)).setY(0).length();
  const offset=(s.frontDatumN!-(front.x-s.center.x)*s.normal.x-(front.z-s.center.y)*s.normal.y)*s.frontSign;
  for(const v of [.1,.5,.9,(3*.85-offset)/depth,(5*.85-offset)/depth]){
  const floor=m.surfacePoint(s,u,v),eye=m.surfacePoint(s,u,v,true),pick=m.selectionAt(s,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,7);expect(m.zonePoint(s.zone.zoneId,pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
  }
 }
 g.dispose();mat.dispose();
});
it('rejects zero pitch, inconsistent risers, missing fronts and incomplete footprint coverage',async()=>{
 await expect(model(s=>{s.rowPitch!.treadMetres=0})).rejects.toThrow('Invalid metric');
 await expect(model(s=>{s.rise=10})).rejects.toThrow('Invalid metric');
 await expect(model(s=>{delete s.rowFrontEdge})).rejects.toThrow('Invalid metric');
 await expect(model(s=>{s.rows=2;s.rise=.4})).rejects.toThrow('do not cover');
});
