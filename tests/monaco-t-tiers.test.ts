import {it,expect} from 'vitest';import {loadCircuit} from '../src/circuits/registry';import {createCircuitContext} from '../src/app/CircuitContext';import {spectatorCanopy} from '../src/circuits/spectatorCanopy';
it('keeps Low High and Covered picks distinct with roof only on Covered',async()=>{
 const d=await loadCircuit('monaco'),r=createCircuitContext(d),m=r.spectators;
 for(const region of d.scene!.regions!.filter(a=>a.zoneId==='t-rascasse')){
  const sf=m.zoneSurfaces.get(region.zoneId)!.find(s=>s.definition.surfaceId===region.surfaceId)!;
  for(const u of [.02,.5,.98])for(const v of [.02,.5,.98]){
   r.store.getState().select({zoneId:region.zoneId,tier:region.tier,u,v});
   const floor=m.surfacePoint(sf,u,v,false),eye=m.surfacePoint(sf,u,v,true),pick=r.selectAt(sf,floor);
   expect(pick.tier).toBe(region.tier);expect(r.observer(pick).distanceTo(eye)).toBeLessThan(.001);expect(eye.y-floor.y).toBeCloseTo(1.2,8);
  }
  const canopy=spectatorCanopy(sf,m);
  if(region.tier==='platinum'){expect(canopy).not.toBeNull();canopy!.roof.dispose();canopy!.posts.dispose()}else expect(canopy).toBeNull();
 }
});
