import { describe, it, expect } from "vitest";
import { circuitRegistry, loadCircuit } from "../src/circuits/registry";
import { createCircuitGeometry } from "../src/circuits/geometry";
import { Vector3 } from "three";
describe("2026 current calendar and independently registered maps",()=>{
  it("uses 23 unique actual venues, including relocated Malaysia event",()=>{
    expect(circuitRegistry).toHaveLength(23);
    expect(new Set(circuitRegistry.map(c=>c.circuitId)).size).toBe(23);
    expect(circuitRegistry.map(c=>c.round)).toEqual(Array.from({length:23},(_,i)=>i+1));
    expect(circuitRegistry.find(c=>c.circuitId==='sepang')?.country).toBe('马来西亚');
    expect(circuitRegistry.some(c=>['sakhir','jeddah'].includes(c.circuitId))).toBe(false);
  });
  for(const summary of circuitRegistry) it(`${summary.circuitId}: closure, metric calibration, unique corners, geographic registration`,async()=>{
    const d = await loadCircuit(summary.circuitId), coords=d.trackGeometry.coordinates;
    expect(coords[0]).toEqual(coords.at(-1));
    const geometry=createCircuitGeometry(coords,d.lengthMetres);
    expect(geometry.calibration).toBeGreaterThan(.94);
    expect(geometry.calibration).toBeLessThan(1.06);
    expect(geometry.length).toBeCloseTo(d.lengthMetres,4);
    if(d.mapAvailability==='preparing') {
      expect(d.validation.layout==='pending'||d.validation.corners==='pending').toBe(true);
      return;
    }
    expect(d.corners.map(c=>c.number)).toEqual(Array.from({length:d.cornerCount},(_,i)=>i+1));
    const samples=Array.from({length:3000},(_,i)=>geometry.at(i/3000*geometry.length));
    const fractions:number[]=[];
    for(const c of d.corners){
      const p=new Vector3((c.coordinate[0]-geometry.origin[0])*111320*Math.cos(geometry.origin[1]*Math.PI/180)*geometry.calibration,0,-(c.coordinate[1]-geometry.origin[1])*111320*geometry.calibration);
      const nearest=samples.reduce((best,q,i)=>q.distanceToSquared(p)<samples[best].distanceToSquared(p)?i:best,0);
      expect(samples[nearest].distanceTo(p)).toBeLessThan(12);
      fractions.push(nearest/3000);
    }
    let advance=0;
    for(let i=1;i<fractions.length;i++)advance+=(fractions[i]-fractions[i-1]+1)%1;
    expect(advance).toBeLessThan(1);
    expect(d.elevation.samples).toEqual([]);
  });
});
