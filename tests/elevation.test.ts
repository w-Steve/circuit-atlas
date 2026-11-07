import { it,expect } from "vitest";
import { terrainHeight } from "../src/circuits/elevation";
import { loadCircuit } from "../src/circuits/registry";
import { createCircuitGeometry } from "../src/circuits/geometry";
for(const id of ['spa','suzuka','austin','interlagos','spielberg','hungaroring','silverstone','zandvoort']) it(`${id}: sourced grid has complete finite heights and preserves true vertical metres`,async()=>{
  const data=await loadCircuit(id),grid=data.elevation.grid!;
  expect(data.elevation.status).toBe('partial');
  expect(grid.heights.length).toBe(id==='suzuka'?103041:id==='silverstone'?66049:4225);
  expect(grid.heights.every(Number.isFinite)).toBe(true);
  expect(data.elevation.source?.url).toBe(id==='suzuka'?'https://maps.gsi.go.jp/development/ichiran.html':id==='silverstone'?'https://environment.data.gov.uk/dataset/13787b9a-26a4-4775-8523-806d13af58fc':'https://zenodo.org/records/18887460');
  const geometry=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
  expect(geometry.length).toBeCloseTo(data.lengthMetres,3);
});
it('interpolates a sourced DEM in vertical metres without changing the published lap length',async()=>{
  const data=await loadCircuit('spa'),grid=data.elevation.grid!;
  expect(grid.heights.length).toBe(grid.size**2);
  const [west,south,east,north]=grid.bounds;
  expect(terrainHeight(data.elevation,west,south)).toBe(grid.heights[0]-grid.referenceAltitude);
  expect(terrainHeight(data.elevation,east,north)).toBeCloseTo(grid.heights.at(-1)!-grid.referenceAltitude,5);
  const geometry=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
  expect(geometry.length).toBeCloseTo(data.lengthMetres,3);
  const heights=geometry.geoPoints.map(p=>p.y);
  expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(50);
  expect(Math.max(...heights)-Math.min(...heights)).toBeLessThan(150);
  geometry.geoPoints.forEach((p,i)=>expect(p.y).toBe(terrainHeight(data.elevation,...data.trackGeometry.coordinates[i])));
});

it('road height remains on the DEM between sparse Spa source vertices',async()=>{
 const data=await loadCircuit('spa'),geometry=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
 for(let i=0;i<1200;i++){
  const p=geometry.at(i/1200*geometry.length),lon=geometry.origin[0]+p.x/(111320*Math.cos(geometry.origin[1]*Math.PI/180)*geometry.calibration),lat=geometry.origin[1]-p.z/(111320*geometry.calibration);
  expect(Math.abs(p.y-terrainHeight(data.elevation,lon,lat))).toBeLessThan(.15);
 }
});
