import {it,expect} from 'vitest';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';

it('every circuit seats grandstand viewers and stands grass/GA viewers above the unchanged floor',async()=>{
 let stands=0,ground=0;
 for(const {circuitId} of circuitRegistry){const data=await loadCircuit(circuitId),source=JSON.stringify(data),r=createCircuitContext(data);
  for(const zone of r.spectators.spectatorZones)for(const u of [.1,.5,.9]){
   const s={zoneId:zone.zoneId,tier:'lower' as const,u,v:.5},floor=r.observerFloor(s),eye=r.observer(s),height=zone.kind==='grandstand'?1.2:1.65;
   expect(eye.y-floor.y,`${circuitId}/${zone.zoneId}`).toBeCloseTo(height,7);expect(eye.x).toBe(floor.x);expect(eye.z).toBe(floor.z);if(zone.kind==='grandstand')stands++;else ground++;
  }expect(JSON.stringify(data)).toBe(source);
 }expect(stands).toBeGreaterThan(0);expect(ground).toBeGreaterThan(0);
},30000);

it('automatic eye height needs no posture state and cannot leak between circuit instances',async()=>{
 const a=createCircuitContext(await loadCircuit('suzuka')),b=createCircuitContext(await loadCircuit('suzuka'));a.store.getState().chooseZone('west-spoon-inner');a.store.getState().select({...a.store.getState().selection,u:.4,v:.6});
 const p=a.store.getState().selection;expect('posture' in p).toBe(false);expect(a.observer(p).y-a.observerFloor(p).y).toBeCloseTo(1.65,7);expect(b.store.getState().selection.zoneId).not.toBe(p.zoneId);
 a.store.getState().chooseZone('r');const seat=a.store.getState().selection;expect(a.observer(seat).y-a.observerFloor(seat).y).toBeCloseTo(1.2,7);
});
