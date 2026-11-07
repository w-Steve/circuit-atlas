import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
it('keeps Yas main stand pointer picks on each of its ten legacy seating blocks',async()=>{
 const data=await loadCircuit('yas-marina'),r=createCircuitContext(data),m=r.spectators;
 const surfaces=m.zoneSurfaces.get('main')!;expect(surfaces).toHaveLength(10);
 expect(data.scene?.regions?.some(s=>s.zoneId==='main')).not.toBe(true);
 for(const sf of surfaces)for(const u of [.01,.5,.99])for(const v of [.01,.5,.99]){
  const floor=m.surfacePoint(sf,u,v,false),eye=m.surfacePoint(sf,u,v,true),pick=r.selectAt(sf,floor);
  expect(r.observer(pick).distanceTo(eye)).toBeLessThan(.001);
  expect(r.observerFloor(pick).distanceTo(floor)).toBeLessThan(.001);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);
 }
});

it('preserves Shanghai authored lower, upper and platinum region picks',async()=>{
 const data=await loadCircuit('shanghai'),r=createCircuitContext(data),m=r.spectators;
 expect(data.scene?.regions?.length).toBeGreaterThan(0);
 for(const region of data.scene!.regions!){
  const surface=m.zoneSurfaces.get(region.zoneId)!.find(s=>s.definition.surfaceId===region.surfaceId)!;
  for(const u of [.1,.5,.9])for(const v of [.1,.5,.9]){
   r.store.getState().select({zoneId:region.zoneId,tier:region.tier,u,v});
   const floor=m.surfacePoint(surface,region.uRange[0]+u*(region.uRange[1]-region.uRange[0]),region.vRange[0]+v*(region.vRange[1]-region.vRange[0]),false);
   const pick=r.selectAt(surface,floor);
   expect(pick.tier).toBe(region.tier);
   expect(r.observerFloor(pick).distanceTo(floor)).toBeLessThan(.001);
  }
 }
});
