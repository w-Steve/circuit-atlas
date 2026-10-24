import {it,expect} from 'vitest';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {resolveTiming} from '../src/circuits/timingGeometry';
import {geographicPoint} from '../src/circuits/facilityGeometry';
for(const summary of circuitRegistry)it(`${summary.circuitId}: independent sourced start/control and three ordered unequal timing sectors`,async()=>{
 const d=await loadCircuit(summary.circuitId),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),source=d.timing!,snapshot=JSON.stringify(d);
 expect(source.circuitId).toBe(d.circuitId);expect(source.source.url).toMatch(/^https:\/\/www.fia.com\//);expect(source.pdfSha256).toMatch(/^[a-f\d]{64}$/);
 expect(source.cornerLabels.length).toBeGreaterThanOrEqual(d.cornerCount-1);
 expect(source.sourceSeason).toBe(['mexico','interlagos','las-vegas','lusail','yas-marina'].includes(d.circuitId)?2025:2026);
 const model=resolveTiming(d,g,source),wrap=(s:number)=>((s%g.length)+g.length)%g.length;
 for(const s of [model.start,model.control,...model.splits]){expect(s).toBeGreaterThanOrEqual(0);expect(s).toBeLessThan(g.length);expect(g.at(s).toArray().every(Number.isFinite)).toBe(true)}
 expect(model.registrationRmsMetres).toBeLessThan(65);
 const lengths=[wrap(model.splits[0]-model.control),wrap(model.splits[1]-model.splits[0]),wrap(model.control-model.splits[1])];
 expect(Math.max(...lengths)-Math.min(...lengths)).toBeGreaterThan(10);expect(lengths.reduce((sum,v)=>sum+v,0)).toBeCloseTo(g.length,5);
 expect(model.sectorAt(model.control+.1)).toBe(0);expect(model.sectorAt(model.splits[0]+.1)).toBe(1);expect(model.sectorAt(model.splits[1]+.1)).toBe(2);
 source.splitAnchors.forEach((anchor,i)=>{
  const corner=geographicPoint(g,d.corners.find(c=>c.number===anchor.corner)!.coordinate),mark=g.at(model.splits[i]);
  if(anchor.reference==='entry')expect(anchor.diagramPoint?.every(Number.isFinite)).toBe(true);
  expect(mark.distanceTo(corner)).toBeLessThan(Math.abs(anchor.offsetMetres)+(anchor.reference==='entry'?200:60));
 });
 if(source.sectorLengthsMetres)expect(source.sectorLengthsMetres.reduce((sum,v)=>sum+v,0)).toBe(d.circuitId==='spielberg'?4326:d.lengthMetres);
 expect(Math.abs(model.lengthMismatchMetres)).toBeCloseTo(d.circuitId==='spielberg'?8:0,7);
 expect(JSON.stringify(d)).toBe(snapshot);
});
