import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {geographicPoint} from '../src/circuits/facilityGeometry';
import source from '../src/circuits/americas/austin-ground-2026.json';

it('records eight independently traced GA patches and excludes restricted service coordinates and timed concert land',()=>{
 expect(source.season).toBe(2026);expect(source.zones).toHaveLength(8);expect(new Set(source.zones.map(z=>JSON.stringify(z.boundary))).size).toBe(8);
 expect(source.sourceSha256).toBe('114986e9622fa214fc754666a2cf4d4ca5a2124fe62381829943e6a7696e657a');
 expect(source.artworkMaximumMarkerDifferencePixels).toBeLessThan(1);expect(source.annualTicketMap.ticketDates).toBe('2026-10-23/2026-10-25');
 expect(source.excludedSources[0].reason).toContain('No PAM coordinates');
 const closed=source.areas.filter(a=>a.concertExcludedPixelArea>0);expect(closed.map(a=>a.zoneId)).toEqual(['ga-t6-t8']);expect(closed[0].concertExcludedPixelArea).toBeGreaterThan(1000);
 for(const area of source.areas){expect(area.issues).toEqual([]);expect(area.roadClearanceMetres).toBeGreaterThan(0)}
 for(const zone of source.zones){expect(zone.kind).toBe('general-admission');expect(zone.surfaces.every(s=>s.terrainFollow&&s.rows===0&&s.rise===0)).toBe(true);expect(zone.source.confidence).toBe('low')}
});

it('shares terrain triangles with standing eyes and reversible continuous picking across all eight patches',async()=>{
 const d=await loadCircuit('austin'),r=createCircuitContext(d),m=r.spectators,material=new MeshBasicMaterial({side:DoubleSide}),heights:number[]=[];
 for(const zone of source.zones){
  const surface=m.zoneSurfaces.get(zone.zoneId)![0],mesh=new Mesh(m.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
  for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
   const floor=m.zonePoint(zone.zoneId,u,v,false),eye=m.zonePoint(zone.zoneId,u,v),pick=m.selectionAt(surface,floor);
   expect(m.zonePoint(zone.zoneId,pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);expect(eye.y-floor.y).toBeCloseTo(1.65,8);heights.push(floor.y);
   const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
  }
  const defaultPoint=geographicPoint(r.geometry,zone.defaultViewpoint.coordinate as [number,number]),pick=m.selectionAt(surface,defaultPoint),actual=m.zonePoint(zone.zoneId,pick.u,pick.v,false);
  expect(Math.hypot(actual.x-defaultPoint.x,actual.z-defaultPoint.z)).toBeLessThan(1e-4);mesh.geometry.dispose();
 }
 expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(10);material.dispose();
});


it('keeps implicit nearest-road picking and bearings when explicit front references are recorded',async()=>{
 const d=await loadCircuit('austin'),implicit=structuredClone(d);
 for(const zone of implicit.spectatorZones)if(source.zones.some(z=>z.zoneId===zone.zoneId))for(const surface of zone.surfaces??[])delete surface.frontReference;
 const before=createCircuitContext(implicit).spectators,after=createCircuitContext(d).spectators;
 for(const zone of source.zones){
  const a=before.surfaceGeometry(before.zoneSurfaces.get(zone.zoneId)![0]),b=after.surfaceGeometry(after.zoneSurfaces.get(zone.zoneId)![0]);
  expect(Array.from(a.getAttribute('position').array)).toEqual(Array.from(b.getAttribute('position').array));
  for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
   expect(before.zonePoint(zone.zoneId,u,v).distanceTo(after.zonePoint(zone.zoneId,u,v))).toBeLessThan(1e-6);
   expect(before.facingTarget(zone.zoneId,u,v).distanceTo(after.facingTarget(zone.zoneId,u,v))).toBeLessThan(1e-6);
  }
  a.dispose();b.dispose();
 }
});
