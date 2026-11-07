import {expect,it} from 'vitest';
import season from '../src/circuits/season2026.json';
import {circuitRegistry,loadCircuit} from '../src/circuits/registry';
import verified from '../src/circuits/season-review/calendar-verification-2026.json';
import inventory from '../src/circuits/season-review/inventory-2026.json';
const metadata=season as Record<string,{coordinate:number[];start:string;end:string}>;
it('matches the independently observed official race weekends and separates event name from host circuit',()=>{
 expect(verified.observedRaceWeekends.map(r=>r.circuitId)).toEqual([...circuitRegistry].sort((a,b)=>a.round-b.round).map(c=>c.circuitId));
 for(const r of verified.observedRaceWeekends){expect(metadata[r.circuitId]).toMatchObject({start:r.start,end:r.end});expect(circuitRegistry.find(c=>c.circuitId===r.circuitId)?.round).toBe(r.round)}
 expect(verified.relocatedEvent).toMatchObject({round:16,circuitId:'sepang',lengthMetres:5543});
 expect(verified.relocatedEvent.eventTitle).toContain('BAHRAIN GRAND PRIX IN MALAYSIA');
 expect(inventory.every(r=>r.calendarCheckedAt===verified.checkedAt)).toBe(true);
});
it('world anchors cover the current calendar once and stay on their real circuit geometry',async()=>{
 expect(Object.keys(metadata).sort()).toEqual(circuitRegistry.map(c=>c.circuitId).sort());
 const locations=new Set<string>();
 for(const c of circuitRegistry){const m=metadata[c.circuitId],data=await loadCircuit(c.circuitId);expect(m.coordinate).toEqual(data.trackGeometry.coordinates[0]);expect(m.coordinate[0]).toBeGreaterThanOrEqual(-180);expect(m.coordinate[0]).toBeLessThanOrEqual(180);expect(m.coordinate[1]).toBeGreaterThan(-60);expect(m.coordinate[1]).toBeLessThan(82);locations.add(m.coordinate.join(','))}
 expect(locations.size).toBe(circuitRegistry.length);
});
it('2026 race weekends follow the effective round order, including the cross-month Mexico weekend',()=>{
 let previous=0;
 for(const c of [...circuitRegistry].sort((a,b)=>a.round-b.round)){const m=metadata[c.circuitId],start=Date.parse(m.start),end=Date.parse(m.end);expect(start).toBeGreaterThan(previous);expect(end-start).toBe(2*86400000);previous=end}
 expect(metadata.mexico).toMatchObject({start:'2026-10-30',end:'2026-11-01'});
});
