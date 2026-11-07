import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
it('keeps partial GA standing at1.65m above its source ground',async()=>{const r=createCircuitContext(await loadCircuit('monaco'));for(const s of r.spectators.zoneSurfaces.get('rocher')!)for(let i=1;i<10;i++)for(let j=1;j<10;j++){const e=r.spectators.surfacePoint(s,i/10,j/10,true),f=r.spectators.surfacePoint(s,i/10,j/10,false);expect(e.y-f.y).toBeCloseTo(1.65,7);expect(r.observer(r.spectators.selectionAt(s,f)).distanceTo(e)).toBeLessThan(.03);}});
