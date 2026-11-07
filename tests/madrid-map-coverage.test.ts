import {it,expect} from 'vitest';
import coverage from '../src/circuits/season-review/madrid-map-coverage-2026.json';
import {loadCircuit} from '../src/circuits/registry';
it('accounts for all46 printed2026 stand codes without double-counting grouped banks',async()=>{
 const data=await loadCircuit('madrid');
 const expected=['GA1','GB1','GB2',...Array.from({length:5},(_,i)=>`GC${i+1}`),...Array.from({length:12},(_,i)=>`GD${i+1}`),...Array.from({length:24},(_,i)=>`GE${i+1}`),'GK1','GK2'];
 const actual=coverage.families.flatMap(f=>f.mapCodes);
 expect(new Set(actual).size).toBe(actual.length);
 expect([...actual].sort()).toEqual([...expected].sort());
 for(const family of coverage.families){
  const model=data.spectatorZones.find(z=>z.zoneId===family.modelZoneId)!;
  expect(model).toBeDefined();expect(model.kind).toBe('grandstand');expect(model.availability).toBe('available');
 }
 expect(coverage.individualBlockGeometryVerified).toBe(false);
 expect(coverage.ticketAllocationVerified).toBe(false);
 expect(data.spectatorZones.find(z=>z.zoneId===coverage.groundArea.modelZoneId)?.kind).not.toBe('grandstand');
});
