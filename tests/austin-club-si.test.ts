import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/americas/austin-club-si-2026.json';
it('separates official ClubSI from ordinary T12 without changing the short-bank physical profile',async()=>{
 const r=createCircuitContext(await loadCircuit('austin')),z=r.data.spectatorZones.find(z=>z.zoneId==='club-si')!,s=r.spectators.zoneSurfaces.get('club-si')![0];
 expect(z.surfaces![0]).toEqual(review.beforeZones[0].surfaces[1]);
 expect(review.evidence.shortBankWithinClubRatio).toBe(1);expect(review.evidence.shortBankWithinOrdinaryT12Ratio).toBe(0);
 expect(r.spectators.zoneSurfaces.get('turn-12')).toHaveLength(1);
 expect(z.admissionNote).toContain('贵宾票');
 for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+i*.998/20,v=.001+j*.998/20,f=r.spectators.surfacePoint(s,u,v,false),eye=r.spectators.surfacePoint(s,u,v,true);
  expect(eye.y-f.y).toBeCloseTo(1.2,8);expect(r.observer(r.selectAt(s,f)).distanceTo(eye)).toBeLessThan(.001);
 }
});
