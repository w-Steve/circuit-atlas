import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/asia/yas-hill-2026.json';
it('loads source Hill and all required fences through the production registry',async()=>{
 const data=await loadCircuit('yas-marina');
 expect(data.spectatorZones.filter(z=>z.zoneId==='abu-dhabi-hill')).toEqual([source.zone]);
 expect(data.spectatorZoneIds).toContain('abu-dhabi-hill');
 for(const id of source.zone.requiredBarrierIds)expect(data.barriers?.barriers.some(b=>b.id===id)).toBe(true);
 const runtime=createCircuitContext(data),surface=runtime.spectators.zoneSurfaces.get('abu-dhabi-hill')![0];
 const eye=runtime.spectators.surfacePoint(surface,.52,.5,true),floor=runtime.spectators.surfacePoint(surface,.52,.5,false);
 expect(eye.y-floor.y).toBeCloseTo(1.65,8);
});
