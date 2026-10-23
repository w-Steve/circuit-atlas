import {it,expect} from 'vitest';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {mapRoad} from '../src/circuits/mapRoad';
it('Suzuka models two road levels instead of resampling both from the same DEM',async()=>{
  const d=await loadCircuit('suzuka'),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation);
  expect(g.geoPoints[137].y-g.geoPoints[68].y).toBeGreaterThanOrEqual(6.99);
  expect(g.length).toBeCloseTo(d.lengthMetres,3);
  const mesh=g.ribbon(14),a=mesh.getAttribute('position');
  for(const i of [500,1800,1950])expect(a.getY(i*2)-.03).toBeCloseTo(g.track.getPointAt(i/2400).y,4);
  mesh.dispose();
});
for(const id of ['monaco','baku'])it(`${id} uses independent narrow edge strips at near parallel roads`,async()=>{
  const d=await loadCircuit(id),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),m=mapRoad(g,14);
  expect(Math.min(...m.widths)).toBeLessThan(14);
  expect(Math.min(...m.widths)).toBeGreaterThanOrEqual(3);
  expect(m.verge.getAttribute('position').count).toBe(4804);
  expect(Array.from(m.verge.getAttribute('position').array).every(Number.isFinite)).toBe(true);
  m.road.dispose();m.verge.dispose();
});
