import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import profiles from '../src/atlas/profiles.json';
import {atlasVenues} from '../src/atlas';

it('all venue concepts correspond to a held source layout with matching statistics and a real SVG',()=>{
 const source=JSON.parse(readFileSync('artifacts/atlas-source/f1db-races.json','utf8'));
 expect(Object.keys(profiles)).toHaveLength(78);
 for(const venue of atlasVenues){
  const p=profiles[venue.id as keyof typeof profiles];
  const rows=source.filter((r:any)=>r.circuitId===venue.id&&r.date<='2026-10-11').sort((a:any,b:any)=>a.date.localeCompare(b.date));
  const latest=rows.at(-1);
  expect([p.layoutId,p.layoutYear,p.lengthMetres,p.corners,p.direction,p.kind]).toEqual([latest.circuitLayoutId,latest.year,Math.round(latest.courseLength*1000),latest.turns,latest.direction,latest.circuitType]);
  expect(p.layoutCount).toBe(new Set(rows.map((r:any)=>r.circuitLayoutId)).size);
  const image=readFileSync(`public/atlas-layouts/${p.layoutId}.svg`,'utf8');
  expect(image).toContain('<svg');expect(image).toContain('<path');expect(image).not.toMatch(/<script|<foreignObject|https?:\/\/[^" ]+\.js/);
 }
});
