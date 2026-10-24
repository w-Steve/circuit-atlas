import {it,expect} from 'vitest';
import {circuitVisit,noteCircuitEntry} from '../src/app/circuitVisit';
import {parseRoute} from '../src/app/navigation';
it('world entry starts a new map visit without changing within-circuit or world memory',()=>{
 const world=parseRoute('#/circuits'),map=parseRoute('#/circuits/suzuka/map'),eye=parseRoute('#/circuits/suzuka/zones/b1/eye');
 const before=circuitVisit('suzuka'),other=circuitVisit('shanghai');
 noteCircuitEntry(world,map);expect(circuitVisit('suzuka')).toBe(before+1);expect(circuitVisit('shanghai')).toBe(other);
 noteCircuitEntry(map,eye);noteCircuitEntry(eye,map);noteCircuitEntry(map,world);
 expect(circuitVisit('suzuka')).toBe(before+1);
 noteCircuitEntry(world,map);expect(circuitVisit('suzuka')).toBe(before+2);
});
