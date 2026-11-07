import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/asia/singapore-super-pit-2026.json';
it('selects SuperPit upper rows on the existing bank without duplicating a structure or moving seated eyes',async()=>{
 const r=createCircuitContext(await loadCircuit('singapore')),m=r.spectators,s=m.zoneSurfaces.get('pit')![0];
 expect(m.zoneSurfaces.get('pit')).toHaveLength(1);
 expect(s.definition.boundary).toEqual(review.beforeZones[0].surfaces[0].boundary);
 expect(s.definition.rows).toBe(32);
 for(const region of review.regions){
  const tier=region.tier as 'lower'|'platinum';r.store.getState().select({zoneId:'pit',tier,u:.5,v:.5});
  for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
   const u=.001+i*.998/20,v=.001+j*.998/20;
   const su=region.uRange[0]+u*(region.uRange[1]-region.uRange[0]),sv=region.vRange[0]+v*(region.vRange[1]-region.vRange[0]);
   const floor=m.surfacePoint(s,su,sv,false),eye=m.surfacePoint(s,su,sv,true),pick=r.selectAt(s,floor);
   expect(pick.tier).toBe(tier);expect(r.observer(pick).distanceTo(eye)).toBeLessThan(.001);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   expect(r.observer({zoneId:'pit',tier,u,v}).distanceTo(eye)).toBeLessThan(.001);
  }
 }
});
