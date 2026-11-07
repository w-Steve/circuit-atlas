import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
it('keeps PadangA and B independently selectable with continuous seated eyes and retained B geometry',async()=>{
 const r=createCircuitContext(await loadCircuit('singapore')),m=r.spectators;
 const centers=[];
 for(const id of ['chicane-turn-1','pit-exit']){
  const sf=m.zoneSurfaces.get(id)![0];centers.push(m.surfacePoint(sf,.5,.5,true));
  for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
   const u=.001+i*.998/20,v=.001+j*.998/20,f=m.surfacePoint(sf,u,v,false),eye=m.surfacePoint(sf,u,v,true);
   expect(eye.y-f.y).toBeCloseTo(1.2,8);expect(r.observer(r.selectAt(sf,f)).distanceTo(eye)).toBeLessThan(.001);
  }
 }
 expect(centers[0].distanceTo(centers[1])).toBeGreaterThan(20);
 expect(m.zoneById('chicane-turn-1')!.name).toBe('Chicane @ Turn 1');
});
