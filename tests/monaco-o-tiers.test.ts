import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/europe/monaco-o-tiers-2026.json';
it('maps O high and low picks to distinct seated heights without changing the outer bank',async()=>{
 const data=await loadCircuit('monaco'),r=createCircuitContext(data),m=r.spectators;
 const z=data.spectatorZones.find(z=>z.zoneId==='o-piscine')!;
 expect(z.boundary).toEqual(review.beforeZones[0].boundary);
 expect(z.surfaces!.reduce((n,s)=>n+s.rows,0)).toBe(14);
 for(const sf of m.zoneSurfaces.get('o-piscine')!){
  for(const u of [.01,.5,.99])for(const v of [.01,.5,.99]){
   const floor=m.surfacePoint(sf,u,v,false),eye=m.surfacePoint(sf,u,v,true);
   const pick=r.selectAt(sf,floor);
   expect(pick.tier).toBe(sf.definition.tier);
   expect(r.observer(pick).distanceTo(eye)).toBeLessThan(.001);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
  }
 }
 const lo=r.observer({zoneId:'o-piscine',tier:'lower',u:.5,v:.5});
 const hi=r.observer({zoneId:'o-piscine',tier:'upper',u:.5,v:.5});expect(hi.y-lo.y).toBeGreaterThan(3);
});
