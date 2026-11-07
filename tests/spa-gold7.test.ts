import {expect,it} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import accepted from '../src/circuits/europe/spa-gold7-2026.json';
it('loads Gold7 and its mandatory real barrier layer through the production registry',async()=>{
 const data=await loadCircuit('spa'),zone=data.spectatorZones.find(z=>z.zoneId==='gold-7-la-source')!;
 expect(zone).toEqual(accepted.zone);expect(zone.openingSource?.url).toContain('20260114');
 expect(data.barriers?.barriers.map(b=>b.id).sort()).toEqual([...zone.requiredBarrierIds!].sort());
 expect(data.spectatorZoneIds).toContain(zone.zoneId);
 const runtime=createCircuitContext(data);
 for(const u of [0,.01,.5,.99,1])for(const v of [0,.5,1]){
  const eye=runtime.spectators.zonePoint(zone.zoneId,u,v),floor=runtime.spectators.zonePoint(zone.zoneId,u,v,false);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(eye.toArray().every(Number.isFinite)).toBe(true);
 }
 expect(zone.surfaces![0].canopy?.source.method).toBe('estimated');
});
