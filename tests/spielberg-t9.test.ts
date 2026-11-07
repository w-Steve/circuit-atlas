import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {resolveSpectatorZoneId} from '../src/circuits/zoneAliases';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/spielberg-t9-identity-2026.json';
import type {SpectatorZone} from '../src/circuits/types';
it('corrects the east bank identity without double-counting it as T8 and T9',async()=>{
 const d=await loadCircuit('spielberg');expect(d.spectatorZones.find(z=>z.zoneId==='t9')).toEqual(source.zone);
 expect(d.spectatorZones.some(z=>z.zoneId==='ost-t8')).toBe(false);expect(d.spectatorZoneIds).toContain('t9');expect(d.spectatorZoneIds).not.toContain('ost-t8');
 expect(resolveSpectatorZoneId(d,'ost-t8')).toBe('t9');expect(d.spectatorZones).toHaveLength(12);
});
it('retains observer and road-facing geometry for every sampled legacy point',async()=>{
 const d=await loadCircuit('spielberg'),next=createCircuitContext(d),old=createCircuitContext({...d,spectatorZoneAliases:undefined,spectatorZones:d.spectatorZones.map(z=>z.zoneId==='t9'?source.oldZone as SpectatorZone:z)});
 for(const u of [.01,.5,.99])for(const v of [.01,.5,.99]){
  const a={zoneId:'ost-t8',tier:'lower' as const,u,v},b={...a,zoneId:'t9'};
  expect(old.observer(a).distanceTo(next.observer(b))).toBe(0);expect(old.lookTarget(a).distanceTo(next.lookTarget(b))).toBe(0);
 }
});
