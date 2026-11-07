import {it,expect} from 'vitest';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/asia/melbourne-season-2026.json';

it('retains historical Moss facts without exposing unsupported2026 eligibility or renaming it to a distant stand',async()=>{
 const d=await loadCircuit('melbourne'),r=createCircuitContext(d),old=review.excludedHistoricalZones[0];
 expect(old.zoneId).toBe('moss');expect(old.surfaces[0].eyeHeight).toBe(1.2);
 expect(d.spectatorZones.some(z=>z.zoneId==='moss')).toBe(false);
 expect(circuitRegistry.find(c=>c.circuitId==='melbourne')!.spectatorZoneIds).not.toContain('moss');
 expect(r.spectators.zoneById('moss')).toBeUndefined();
 expect(d.spectatorZones.filter(z=>z.zoneId.startsWith('park-pass-'))).toHaveLength(5);
 for(const entry of review.newOfficialFootprints){
  expect(entry.modelPresent).toBe(true);expect(entry.pdfBoundary[0]).toEqual(entry.pdfBoundary.at(-1));
  const current=d.spectatorZones.find(z=>z.zoneId===entry.zoneId)!;
  expect(current.name).toBe(entry.name);expect(current.boundary).not.toEqual(old.boundary);
 }
});
