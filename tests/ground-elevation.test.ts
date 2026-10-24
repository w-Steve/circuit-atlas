import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadCircuit} from '../src/circuits/registry';
import coverage from '../src/circuits/elevation-source/coverage.json';
import {terrainHeight} from '../src/circuits/elevation';

for(const id of coverage.filter(c=>c.dataset==='GEDTM30-v1.2').map(c=>c.circuitId))it(`${id}: bare-earth grid retains exact sourced values, units and attribution`,async()=>{
 const raw=readFileSync(new URL(`../src/circuits/elevation-source/ground-grids/${id}.json`,import.meta.url));
 const source=JSON.parse(raw.toString()),data=await loadCircuit(id),row=coverage.find(r=>r.circuitId===id)!;
 expect(createHash('sha256').update(raw).digest('hex')).toBe(row.responseSha256[0]);
 expect(source.license).toBe('CC-BY-4.0');expect(source.version).toBe('1.2.0');expect(source.valueScaleApplied).toBe(1);
 expect(source.nativeWindow.float32Sha256).toMatch(/^[a-f\d]{64}$/);
 expect(data.elevation.grid).toEqual(source.grid);expect(data.elevation.source?.url).toBe(source.source);
 const grid=data.elevation.grid!,[west,south,east,north]=grid.bounds;
 const x=19,y=37,lon=west+(east-west)*x/64,lat=south+(north-south)*y/64;
 expect(terrainHeight(data.elevation,lon,lat)).toBeCloseTo(grid.heights[y*65+x]-grid.referenceAltitude,5);
 expect(row.srtmBaseline?.sampleCount).toBe(289);
 // A metadata-scale error would flatten Monaco's genuine coastal hills by 10x.
 if(id==='monaco')expect(Math.max(...grid.heights)).toBeGreaterThan(150);
});
