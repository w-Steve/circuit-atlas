import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import source from '../src/circuits/europe/silverstone-farm-ga-2026.json';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitBarrierPackage,SpectatorZone} from '../src/circuits/types';
async function candidate(){
 const data=structuredClone(await loadCircuit('silverstone'));data.spectatorZones=data.spectatorZones.filter(z=>z.zoneId!==source.zone.zoneId).map(z=>z.zoneId==='farm-curve'?source.stand as SpectatorZone:z);data.spectatorZones.push({...source.zone,availability:'available'} as SpectatorZone);
 data.barriers={...source.barrierLayer,availability:'available',barriers:[...(data.barriers?.barriers??[]).filter(b=>!source.zone.requiredBarrierIds.includes(b.id)),...source.barrierLayer.barriers]} as CircuitBarrierPackage;return data;
}
it('uses the connected native foreground while standing on a source-sampled fine mesh',async()=>{
 const rt=createCircuitContext(await candidate()),m=rt.spectators,surface=m.zoneSurfaces.get(source.zone.zoneId)![0];
 expect(source.previousQueryWasIncomplete).toBe(true);expect(source.sourceConnections).toEqual({'995to997':'3639746105','997to994':'3643380799','995to998':'3639746107'});expect(source.mapDrawingIndex).toBe(40);expect(source.zone.source.confidence).toBe('low');
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
 try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+.998*i/20,v=.001+.998*j/20,eye=m.zonePoint(source.zone.zoneId,u,v),floor=m.zonePoint(source.zone.zoneId,u,v,false),pick=m.selectionAt(surface,eye);
  expect(pick.u).toBeCloseTo(u,5);expect(pick.v).toBeCloseTo(v,5);expect(eye.y-floor.y).toBeCloseTo(1.65,8);expect(Math.abs(floor.y-rt.geometry.groundAt(floor.x,floor.z))).toBeLessThan(.03);expect(new Raycaster(eye,new Vector3(0,-1,0),0,2).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.65,3);
 }}finally{mesh.geometry.dispose();material.dispose()}
});
it('preserves seated Farm physics, requires every native fence and rejects unsafe subdivision settings',async()=>{
 const data=await candidate();expect(data.spectatorZones.find(z=>z.zoneId==='farm-curve')!.surfaces![0]).toMatchObject({rows:13,rise:6.44,baseHeight:2.2,eyeHeight:1.2,fenceMode:'authored'});
 for(const id of source.zone.requiredBarrierIds){const missing=structuredClone(data);missing.barriers!.barriers=missing.barriers!.barriers.filter(b=>b.id!==id);expect(()=>createCircuitContext(missing)).toThrow('Required spectator barrier geometry unavailable')}
 for(const spacing of [0,.1,9,NaN,Infinity]){const d=structuredClone(data);d.spectatorZones.find(z=>z.zoneId===source.zone.zoneId)!.surfaces![0].terrainMeshSpacingMetres=spacing;expect(()=>createCircuitContext(d)).toThrow('Invalid public-ground terrain mesh spacing')}
});
