import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadCircuit} from '../src/circuits/registry';
import coverage from '../src/circuits/elevation-source/coverage.json';
import {terrainHeight} from '../src/circuits/elevation';

for(const id of coverage.map(c=>c.circuitId))it(`${id}: bare-earth grid retains exact sourced values, units and attribution`,async()=>{
 const raw=readFileSync(new URL(`../src/circuits/elevation-source/ground-grids/${id}.json`,import.meta.url));
 const source=JSON.parse(raw.toString()),data=await loadCircuit(id),row=coverage.find(r=>r.circuitId===id)!;
 const baseline=row.dataset==='GEDTM30-v1.2'?row:('gedtmBaseline' in row?row.gedtmBaseline:undefined);
 expect(baseline).toBeDefined();expect(createHash('sha256').update(raw).digest('hex')).toBe(baseline!.responseSha256[0]);
 expect(source.license).toBe('CC-BY-4.0');expect(source.version).toBe('1.2.0');expect(source.valueScaleApplied).toBe(1);
 expect(source.nativeWindow.float32Sha256).toMatch(/^[a-f\d]{64}$/);
 if(row.dataset==='GEDTM30-v1.2'){expect(data.elevation.grid).toEqual(source.grid);expect(data.elevation.source?.url).toBe(source.source)}
 else if(row.dataset==='EA-LIDAR-COMPOSITE-DTM-1m'){
  const ea=JSON.parse(readFileSync(new URL('../src/circuits/elevation-source/candidates/silverstone-ea-dtm.json',import.meta.url),'utf8'));
  expect(id).toBe('silverstone');expect(data.elevation.grid).toEqual(ea.grid);
  expect(row.responseSha256).toEqual([ea.wcs.sha256]);expect(row.source).toBe(ea.source);
  expect(ea.sceneAcceptance.accepted).toBe(true);expect(ea.runtimeApplied).toBe(true);
  expect(ea.units).toBe('metres');expect(ea.verticalDatum).toBe('Ordnance Datum Newlyn');
  expect(ea.survey.year).toBe('2019');expect(ea.horizontalTransform.bestAvailable).toBe(true);
 }
 else{
  expect(['TINITALY-1.1','GSI-DEM5A-10B','IGN-RGE-ALTI-2026-10-26']).toContain(row.dataset);expect(data.elevation.source?.url).toBe(row.source);
  const file=({'monza':'monza-tinitaly','suzuka':'suzuka-gsi','monaco':'monaco-ign-rge'} as Record<string,string>)[id];
  const regionalRaw=readFileSync(new URL(`../src/circuits/elevation-source/regional-grids/${file}.json`,import.meta.url));
  expect(createHash('sha256').update(regionalRaw).digest('hex')).toBe(row.responseSha256[0]);
  expect(data.elevation.grid).toEqual(JSON.parse(regionalRaw.toString()).grid);
 }
 const grid=source.grid,[west,south,east,north]=grid.bounds;
 const x=19,y=37,lon=west+(east-west)*x/64,lat=south+(north-south)*y/64;
 expect(terrainHeight({...data.elevation,grid},lon,lat)).toBeCloseTo(grid.heights[y*65+x]-grid.referenceAltitude,5);
 expect(row.srtmBaseline?.sampleCount).toBe(289);
 // A metadata-scale error would flatten Monaco's genuine coastal hills by 10x.
 if(id==='monaco')expect(Math.max(...grid.heights)).toBeGreaterThan(150);
});
