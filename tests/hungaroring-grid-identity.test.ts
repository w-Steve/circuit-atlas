import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import osm from '../src/circuits/europe/osm/hungaroring-osm.json';
import config from '../src/circuits/europe/hungaroring-structural-datums.json';

it('Grid products follow the organizer map order rather than stale OSM name tags',async()=>{
 const data=await loadCircuit('hungaroring'),r=createCircuitContext(data);
 const zone=(id:string)=>data.spectatorZones.find(z=>z.zoneId===id)!;
 for(const [id,way,rows] of [['grid-2',230979498,29],['grid-3',1085151669,25]] as const){
  const source=osm.elements.find(e=>e.id===way)!,z=zone(id),s=z.surfaces![0];
  expect(z.boundary).toEqual(source.geometry.map(p=>[p.lon,p.lat]));
  expect(s.boundary).toEqual(z.boundary);expect(s.rows).toBe(rows);
  expect(s.baseHeight).toBe(2.2);expect(s.eyeHeight).toBe(1.2);
  expect(z.source.url).toBe(`https://www.openstreetmap.org/way/${way}`);
  for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
   const eye=r.spectators.zonePoint(id,u,v),floor=r.spectators.zonePoint(id,u,v,false),target=r.spectators.facingTarget(id,u,v);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   expect(target.toArray().every(Number.isFinite)).toBe(true);
  }
 }
 const center=(id:string)=>r.spectators.zonePoint(id,.5,.5,false);
 const origin=center('grid-1'),axis=center('grand-prix-1').sub(origin).setY(0).normalize();
 const projection=(id:string)=>center(id).sub(origin).setY(0).dot(axis);
 expect(projection('grid-3')).toBeGreaterThan(20);
 expect(projection('grid-2')-projection('grid-3')).toBeGreaterThan(20);
 expect(projection('grand-prix-1')).toBeGreaterThan(projection('grid-2'));
 // No reduction in inventory or hidden deletion of physical obstacles.
 expect(data.spectatorZones.filter(z=>z.availability==='available')).toHaveLength(20);
 expect(config.gridIdentityReview.map.season).toBe(2025);
 expect(config.gridIdentityReview.map.limitation).toContain('not surveyed');
});

it('footprint reassignment preserves unrelated stands and keeps vertical profiles with their products',async()=>{
 const d=await loadCircuit('hungaroring');
 for(const previous of config.gridIdentityReview.retainedOriginalZones){
  const z=d.spectatorZones.find(z=>z.zoneId===previous.zoneId)!;
  for(const key of ['rise','baseHeight','eyeHeight','rows','rowRiserMetres'] as const)
   expect(z.surfaces![0][key]).toBe(previous.surfaces[0][key]);
  expect(z.openingSource).toEqual(previous.openingSource);
 }
 for(const z of d.spectatorZones.filter(z=>!['hungaroring','grid-2','grid-3'].includes(z.zoneId))){
  const way=Number(z.source.url.match(/way\/(\d+)/)?.[1]),raw=osm.elements.find(e=>e.id===way);
  if(raw)expect(z.boundary).toEqual(raw.geometry.map(p=>[p.lon,p.lat]));
 }
});
