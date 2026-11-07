import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/asia/baku-c-tiers-2026.json';
it('maps C upper and lower picks to distinct seated heights without changing the outer bank',async()=>{
 const data=await loadCircuit('baku'),r=createCircuitContext(data),m=r.spectators;
 const z=data.spectatorZones.find(z=>z.zoneId==='absheron-c')!;
 expect(z.boundary).toEqual(review.beforeZones[0].boundary);
 expect(z.surfaces!.reduce((n,s)=>n+s.rows,0)).toBe(23);
 for(const sf of m.zoneSurfaces.get('absheron-c')!){
  for(const u of [.01,.5,.99])for(const v of [.01,.5,.99]){
   const floor=m.surfacePoint(sf,u,v,false),eye=m.surfacePoint(sf,u,v,true);
   const pick=r.selectAt(sf,floor);
   expect(pick.tier).toBe(sf.definition.tier);
   expect(r.observer(pick).distanceTo(eye)).toBeLessThan(.001);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
  }
 }
 const lo=r.observer({zoneId:'absheron-c',tier:'lower',u:.5,v:.5});
 const hi=r.observer({zoneId:'absheron-c',tier:'upper',u:.5,v:.5});expect(hi.y-lo.y).toBeGreaterThan(5);
});
