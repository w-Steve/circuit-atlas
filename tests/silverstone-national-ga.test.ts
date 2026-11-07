import {expect,it} from 'vitest';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import source from '../src/circuits/europe/silverstone-national-ga-2026.json';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {barrierGeometry} from '../src/circuits/barrierGeometry';
import type {CircuitBarrierPackage,SpectatorZone} from '../src/circuits/types';
import {geographicPoint} from '../src/circuits/facilityGeometry';
async function candidate(){
 const data=structuredClone(await loadCircuit('silverstone'));
 data.spectatorZones=[...data.spectatorZones.filter(z=>z.zoneId!==source.zone.zoneId),{...source.zone,availability:'available'} as SpectatorZone];
 data.barriers={...source.barrierLayer,availability:'available',barriers:[...(data.barriers?.barriers??[]).filter(b=>!source.zone.requiredBarrierIds.includes(b.id)),...source.barrierLayer.barriers]} as CircuitBarrierPackage;
 const stand=data.spectatorZones.find(z=>z.zoneId==='national-pit-straight')!;stand.surfaces![0].fenceMode='authored';stand.requiredBarrierIds=source.zone.requiredBarrierIds;return data;
}
it('keeps the interpreted ground region bounded, terrain-following and continuously selectable at standing eye height',async()=>{
 expect(source.mapDrawingIndex).toBe(38);expect(source.bodyClearanceMetres).toBe(.3);expect(source.zone.source.confidence).toBe('low');
 const rt=createCircuitContext(await candidate()),m=rt.spectators,s=m.zoneSurfaces.get(source.zone.zoneId)![0];
 const mesh=new Mesh(m.surfaceGeometry(s),new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld(true);
 try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+.998*i/20,v=.001+.998*j/20;
  const eye=m.zonePoint(source.zone.zoneId,u,v),floor=m.zonePoint(source.zone.zoneId,u,v,false),pick=m.selectionAt(s,eye);
  expect(eye.y-floor.y).toBeCloseTo(1.65,8);expect(pick.u).toBeCloseTo(u,5);expect(pick.v).toBeCloseTo(v,5);
  const hit=new Raycaster(eye,new Vector3(0,-1,0),0,2).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.distance).toBeCloseTo(1.65,3);
 }}finally{mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose()}
});
it('renders solid wall occlusion even when a barrier layer contains no fence posts',async()=>{
 const data=await candidate(),rt=createCircuitContext(data);
 data.barriers!.barriers=data.barriers!.barriers.filter(b=>b.kind==='concrete-wall');
 const wall=data.barriers!.barriers[0],model=barrierGeometry(data,rt.geometry);
 expect(model.posts).toHaveLength(0);expect(model.wires.getAttribute('position').count).toBe(0);
 const a=geographicPoint(rt.geometry,wall.coordinates[0]),b=geographicPoint(rt.geometry,wall.coordinates[1]);
 const mid=a.clone().lerp(b,.5),normal=new Vector3(-(b.z-a.z),0,b.x-a.x).normalize();mid.y=rt.geometry.groundAt(mid.x,mid.z)+wall.heightMetres/2;
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(model.solids,material);mesh.updateMatrixWorld(true);
 try{expect(new Raycaster(mid.clone().add(normal),normal.clone().negate(),0,2).intersectObject(mesh).length).toBeGreaterThan(0)}finally{model.wires.dispose();model.solids.dispose();material.dispose()}
});
it('retains native wire and solid wall occlusion, and refuses missing, unaccepted or invalid required barriers',async()=>{
 const data=await candidate(),rt=createCircuitContext(data),model=barrierGeometry(data,rt.geometry);
 expect(model.posts.length).toBeGreaterThan(20);expect(model.solids.getAttribute('position').count).toBeGreaterThan(0);
 model.wires.dispose();model.solids.dispose();
 for(const mutate of [
  (d:typeof data)=>{d.barriers=undefined},
  (d:typeof data)=>{d.barriers!.availability='preparing'},
  (d:typeof data)=>{d.barriers!.barriers[0].heightMetres=NaN},
 ]){const d=structuredClone(data);mutate(d);expect(()=>createCircuitContext(d)).toThrow('Required spectator barrier geometry unavailable')}
});
