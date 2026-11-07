import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/americas/austin-t12-rows-2026.json';
it('models the T12 maximum on the long bank without adding rows across disconnected banks or changing physical scale',async()=>{
 const r=createCircuitContext(await loadCircuit('austin')),surfaces=r.spectators.zoneSurfaces.get('turn-12')!;
 expect(surfaces.map(s=>s.definition.rows)).toEqual([37]);
 const club=r.spectators.zoneSurfaces.get('club-si')![0];
 expect(club.definition.boundary).toEqual(review.beforeZones[0].surfaces[1].boundary);
 expect(club.definition.rows).toBe(18); // Retained render steps, not official Club SI row numbering.
 for(const [i,s] of surfaces.entries()){
  const old=review.beforeZones[0].surfaces[i];
  expect(s.definition.boundary).toEqual(old.boundary);
  expect(r.data.spectatorZones.find(z=>z.zoneId==='turn-12')!.surfaces![i].baseHeight).toBe(old.baseHeight);
  expect(s.definition.rise).toBe(old.rise);
  for(let j=0;j<=20;j++)for(let k=0;k<=20;k++){
   const u=.001+j*.998/20,v=.001+k*.998/20,floor=r.spectators.surfacePoint(s,u,v,false),eye=r.spectators.surfacePoint(s,u,v,true);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   expect(r.observer(r.selectAt(s,floor)).distanceTo(eye)).toBeLessThan(.001);
  }
 }
});
