import {it,expect} from 'vitest';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import coverage from '../src/circuits/elevation-source/coverage.json';
import {createCircuitGeometry} from '../src/circuits/geometry';
it('all 23 current circuits retain complete sourced regional elevation and valid metric geometry',async()=>{
 expect(coverage.map(c=>c.circuitId).sort()).toEqual(circuitRegistry.map(c=>c.circuitId).sort());
 for(const row of coverage){
  const data=await loadCircuit(row.circuitId),grid=data.elevation.grid!;
  expect(row.sampleCount).toBe(({srtm90m:289,'GEDTM30-v1.2':4225,'EA-LIDAR-COMPOSITE-DTM-1m':66049,'TINITALY-1.1':66049,'GSI-DEM5A-10B':103041,'IGN-RGE-ALTI-2026-10-26':16641} as Record<string,number>)[row.dataset]);
  expect(row.responseSha256).toHaveLength(row.dataset==='srtm90m'?3:1);expect(row.responseSha256.every(h=>/^[a-f\d]{64}$/.test(h))).toBe(true);
  expect(grid.heights).toHaveLength(grid.size**2);expect(grid.heights.every(Number.isFinite)).toBe(true);expect(data.elevation.source?.checkedAt).toBe(row.checkedAt);expect(row.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect([Math.min(...grid.heights),Math.max(...grid.heights)]).toEqual([row.minMetres,row.maxMetres]);
  const g=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);expect(g.length).toBeCloseTo(data.lengthMetres,3);
  expect(g.geoPoints.every(p=>p.toArray().every(Number.isFinite))).toBe(true);
 }
 expect(coverage.every(c=>c.runtimeApplied)).toBe(true);
});
