import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {atlasVenues,atlasYears,loadCalendars,matchesVenue,venueById,venuePath} from '../src/atlas';
import {parseRoute} from '../src/app/navigation';
import {circuitRegistry} from '../src/circuits/registry';
const source=JSON.parse(readFileSync('artifacts/atlas-source/f1db-races.json','utf8')) as {year:number;round:number;date:string;circuitId:string;circuitLayoutId:string}[];
describe('historical location atlas',()=>{
 it('covers all 77 seasons with source-identical historical dates, venues and layouts',async()=>{
  const calendar=await loadCalendars();expect(Object.keys(calendar).map(Number).sort((a,b)=>b-a)).toEqual(atlasYears);
  let count=0;
  for(const race of source.filter(r=>r.year<2026)){
   const record=calendar[race.year].find(r=>r.round===race.round)!;
   expect([record.date,record.venueId,record.layoutId]).toEqual([race.date,race.circuitId,race.circuitLayoutId]);count++;
  }
  expect(count).toBe(1149);
  expect(calendar['1950']).toHaveLength(7);expect(calendar['2020']).toHaveLength(17);expect(calendar['2025']).toHaveLength(24);
  for(const rows of Object.values(calendar)){
   expect(rows.map(r=>r.round)).toEqual(Array.from({length:rows.length},(_,i)=>i+1));
   expect(rows.map(r=>r.date)).toEqual(rows.map(r=>r.date).sort());
   for(const r of rows){expect(venueById.has(r.venueId)).toBe(true);expect(r.lengthMetres).toBeGreaterThan(1000)}
  }
 });
 it('counts venues once and only counts held championship races, including Indianapolis',()=>{
  expect(atlasVenues).toHaveLength(78);expect(new Set(atlasVenues.map(v=>v.id)).size).toBe(78);
  for(const v of atlasVenues){
   const held=source.filter(r=>r.circuitId===v.id&&r.date<='2026-10-11');
   expect(v.raceCount).toBe(held.length);expect(v.years).toEqual([...new Set(held.map(r=>r.year))].sort());
   expect(v.coordinate[0]).toBeGreaterThanOrEqual(-180);expect(v.coordinate[0]).toBeLessThanOrEqual(180);
   expect(v.coordinate[1]).toBeGreaterThanOrEqual(-90);expect(v.coordinate[1]).toBeLessThanOrEqual(90);
  }
  expect(source.filter(r=>r.circuitId==='indianapolis'&&r.year<=1960)).toHaveLength(11);
 });
 it('keeps double headers as distinct rounds at one venue and separates nearby sites',async()=>{
  const c=await loadCalendars();expect(c['2020'].filter(r=>r.venueId==='silverstone')).toHaveLength(2);
  expect(c['2020'].filter(r=>r.venueId==='bahrain').map(r=>r.layoutId)).toEqual(['bahrain-1','bahrain-3']);
  expect(venueById.get('zeltweg')!.coordinate).not.toEqual(venueById.get('spielberg')!.coordinate);
  expect(venueById.get('caesars-palace')!.id).not.toBe(venueById.get('las-vegas')!.id);
 });
 it('links precisely the existing 23 packages without inventing historical 3D availability',async()=>{
  const current=atlasVenues.filter(v=>v.currentSeason),c=await loadCalendars();expect(current).toHaveLength(23);
  expect(current.map(v=>v.modelId).sort()).toEqual(circuitRegistry.map(v=>v.circuitId).sort());
  expect(c['2026'].map(r=>r.venueId).sort()).toEqual(current.map(v=>v.id).sort());
  for(const v of atlasVenues.filter(v=>!v.currentSeason))expect(v.modelId).toBeNull();
  expect(parseRoute(venuePath(venueById.get('nurburgring')!))).toEqual({level:'atlas',venueId:'nurburgring'});
 });
 it('searches Chinese, original names, countries and unaccented aliases',()=>{
  expect(matchesVenue(venueById.get('nurburgring')!,'纽北')).toBe(true);
  expect(matchesVenue(venueById.get('nurburgring')!,'nurburgring')).toBe(true);
  expect(matchesVenue(venueById.get('shanghai')!,'China')).toBe(true);
  expect(matchesVenue(venueById.get('buenos-aires')!,'galvez')).toBe(true);
 });
});
