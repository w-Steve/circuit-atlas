import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import source from '../src/circuits/europe/silverstone-club-2026.json';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {resolveSpectatorZoneId} from '../src/circuits/zoneAliases';
import type {SpectatorZone} from '../src/circuits/types';
async function candidate(){
 const data=structuredClone(await loadCircuit('silverstone')),retired=new Set([...source.oldZones,...source.zones].map(z=>z.zoneId));
 data.spectatorZones=[...data.spectatorZones.filter(z=>!retired.has(z.zoneId)),...source.zones.map(z=>({...structuredClone(z),availability:'available',geometryReview:{...z.geometryReview,issues:[]}}) as SpectatorZone)];
 data.spectatorZoneAliases=source.aliases;return data;
}
it('represents native Club A and one continuous Club Corner without invented internal B/C boundaries',async()=>{
 const data=await candidate();expect(source.annualMap.labels).toEqual(['Club A','Club Corner']);
 expect(source.zones.map(z=>z.boundary.length)).toEqual([6,13]);
 expect(source.zones.map(z=>z.name)).toEqual(['Club A','Club Corner']);
 expect(data.spectatorZones.filter(z=>z.zoneId.startsWith('club-corner')).map(z=>z.zoneId)).toEqual(['club-corner-a','club-corner']);
 for(const id of ['club-corner-b','club-corner-c'])expect(resolveSpectatorZoneId(data,id)).toBe('club-corner');
 data.spectatorZones.find(z=>z.zoneId==='club-corner')!.availability='preparing';
 expect(resolveSpectatorZoneId(data,'club-corner-b')).toBe('club-corner-b');
 expect(resolveSpectatorZoneId(data,'unknown')).toBe('unknown');
});
it('publishes only the two accepted native banks and never substitutes aliases for real zones',async()=>{
 const data=await loadCircuit('silverstone');
 for(const zone of source.zones)expect(data.spectatorZones.find(z=>z.zoneId===zone.zoneId)).toEqual(zone);
 expect(data.spectatorZoneAliases).toEqual({...source.aliases,'copse-yard':'inside-nine'});
 const modified=structuredClone(data);modified.spectatorZoneAliases!['club-corner-a']='copse-a';
 expect(resolveSpectatorZoneId(modified,'club-corner-a')).toBe('club-corner-a');
});
it('supports physical treads, inverse selection, seated eyes and nonburied native footprints',async()=>{
 const rt=createCircuitContext(await candidate()),model=rt.spectators;
 for(const zone of source.zones){
  const surface=model.zoneSurfaces.get(zone.zoneId)![0];
  const mesh=new Mesh(model.surfaceGeometry(surface,p=>rt.geometry.groundAt(p.x,p.y)-.15),new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld(true);
  try{for(const u of [.01,.1,.5,.9,.99])for(const v of [.01,.37,.73,.99]){
   const floor=model.zonePoint(zone.zoneId,u,v,false),eye=model.zonePoint(zone.zoneId,u,v),pick=model.selectionAt(surface,eye);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(floor.y-rt.geometry.groundAt(floor.x,floor.z),zone.zoneId).toBeGreaterThan(0);
   expect(pick.u).toBeCloseTo(u,5);expect(pick.v).toBeCloseTo(v,5);
   const hit=new Raycaster(eye,new Vector3(0,-1,0),0,2).intersectObject(mesh)[0];expect(hit,`${zone.zoneId} ${u}/${v}`).toBeDefined();expect(hit.distance).toBeCloseTo(1.2,3);
  }}finally{mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose()}
 }
});
