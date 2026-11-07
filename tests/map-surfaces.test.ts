import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {mapRoad} from '../src/circuits/mapRoad';
import monacoRegional from '../src/circuits/elevation-source/regional-grids/monaco-ign-rge.json';
import type {CircuitPackage} from '../src/circuits/types';
it('Suzuka models two road levels instead of resampling both from the same DEM',async()=>{
  const d=await loadCircuit('suzuka'),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation);
  expect(g.geoPoints[137].y-g.geoPoints[68].y).toBeGreaterThanOrEqual(6.99);
  expect(g.length).toBeCloseTo(d.lengthMetres,3);
  const mesh=g.ribbon(14),a=mesh.getAttribute('position');
  for(const i of [500,1800,1950])expect(a.getY(i*2)-.03).toBeCloseTo(g.track.getPointAt(i/2400).y,4);
  mesh.dispose();
});
for(const id of ['monaco','baku'])it(`${id} uses independent narrow edge strips at near parallel roads`,async()=>{
  const d=await loadCircuit(id);
  // Preserve the original close-road regression against its original DEM.
  const elevation=id==='monaco'?monacoRegional.previousElevation as CircuitPackage['elevation']:d.elevation;
  const g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,elevation),m=mapRoad(g,14);
  expect(Math.min(...m.widths)).toBeLessThan(14);
  expect(Math.min(...m.widths)).toBeGreaterThanOrEqual(3);
  expect(m.verge.getAttribute('position').count).toBe(4804);
  expect(Array.from(m.verge.getAttribute('position').array).every(Number.isFinite)).toBe(true);
  m.road.dispose();m.verge.dispose();
});
it('Monaco regional terrain keeps vertically separated neighbouring roads at their declared width',async()=>{
 const d=await loadCircuit('monaco'),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation);
 const a=g.at(114*g.length/1200),b=g.at(152*g.length/1200),m=mapRoad(g,d.trackGeometry.widthMetres);
 expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeLessThan(14);
 expect(Math.abs(a.y-b.y)).toBeGreaterThan(3);
 expect(m.widths[114]).toBe(d.trackGeometry.widthMetres);expect(m.widths[152]).toBe(d.trackGeometry.widthMetres);
 m.road.dispose();m.verge.dispose();
});
