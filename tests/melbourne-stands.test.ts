import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/asia/melbourne-stands-2026.json';
import audit from '../src/circuits/season-review/melbourne-footprint-audit.json';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

it('binds the complete official-footprint comparison to the actual current package',()=>{
 expect(audit.areas).toHaveLength(19);expect(new Set(audit.areas.map(a=>a.zoneId)).size).toBe(19);
 expect(audit.sourceSha256).toBe(source.sourceSha256);
 expect(audit.generatedSha256).toBe(createHash('sha256').update(readFileSync('src/circuits/generated/melbourne.json')).digest('hex'));
 expect(audit.areas.find(a=>a.zoneId==='stewart')!.centroidOffsetMetres).toBeLessThan(1e-6);
 // Check every migrated stand against its own authored outline. Shared PDF
 // endpoint rounding is normalized by at most a few millimetres in world units.
 for(const zone of source.zones){
  const area=audit.areas.find(a=>a.zoneId===zone.zoneId)!;
  expect(area.centroidOffsetMetres,zone.zoneId).toBeLessThan(.005);
  expect(area.sourceRoadIntersectionMetres2,zone.zoneId).toBeLessThan(1e-6);
 }
});

it('uses distinct2026 map footprints and retains displaced historical geometry',()=>{
 expect(source.areas.map(a=>a.pdfDrawingIndex)).toEqual([8786,8785,8781,8783,8774,8780,8773,8788,8789,8779,8791,8790,8782,8777,8784,8775,8778,8776,8787]);
 expect(source.replacedZones[0].zoneId).toBe('waite');
 expect(source.replacedZones[0].surfaces[0].rows).toBe(30);
 expect(source.replacedZones[0].surfaces[0].boundary).not.toEqual(source.zones[2].surfaces[0].boundary);
 for(const a of source.areas){expect(a.planarIssues).toEqual([]);expect(a.roadClearanceMetres).toBeGreaterThan(0)}
 for(const a of source.areas.slice(0,3))expect(a.roadClearanceMetres).toBeGreaterThan(9);
 expect(new Set(source.zones.map(z=>JSON.stringify(z.boundary))).size).toBe(19);
 expect(source.registration.localT4Correction.markerDrawingIndex).toBe(5027);
 expect(source.registration.localT4Correction.markerPdfPoint).toEqual([166.17290496826172,515.2514343261719]);
 expect(source.registration.localT4Correction.correctedPdfPoint).toEqual([166.53926781509122,515.2128114667534]);
 expect(source.registration.startStraightCorrection.marker1DrawingIndex).toBe(5024);
 expect(source.registration.startStraightCorrection.marker14DrawingIndex).toBe(5037);
 expect(source.registration.startStraightCorrection.pairedCurveItems).toEqual([0,12]);
 expect(source.registration.localT8Correction.markerDrawingIndex).toBe(5031);
 expect(source.registration.localT8Correction.correctedPdfPoint[0]).toBeCloseTo(273.53095464,7);
 expect(source.registration.localT8Correction.correctedPdfPoint[1]).toBeCloseTo(233.48324478,7);
 expect(source.t8Migration.previousAcceptedZones.map(z=>z.zoneId)).toEqual(['engineers-australia','mercedes-amg','waite']);
 for(const join of source.sharedVertexNormalizations)expect(join.maximumShiftPdfPoints).toBeLessThan(.00075);
});

it('keeps corrected stands inside their local150m road branch instead of aiming at a distant turn',async()=>{
 const d=structuredClone(await loadCircuit('melbourne'));for(const z of d.spectatorZones)if(source.zones.some(s=>s.zoneId===z.zoneId))z.availability='available';
 const r=createCircuitContext(d),g=r.geometry;
 for(const id of ['fangio','piastri','jones','senna','prost','schumacher','webber','button','ricciardo','lauda','vettel','clark','brabham']){
  const ref=r.spectators.zoneSurfaces.get(id)![0].definition.frontReference!;
  const point=new Vector3((ref[0]-g.origin[0])*111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration,0,-(ref[1]-g.origin[1])*111320*g.calibration);
  const referenceArc=r.spectators.nearestTrack(point).distance;
  for(const u of [.05,.5,.95]){
   const eye=r.observer({zoneId:id,tier:'lower',u,v:.5}),arc=r.spectators.nearestTrack(eye).distance;
   const delta=Math.abs(referenceArc-arc);expect(Math.min(delta,g.length-delta),id).toBeLessThan(150);
  }
 }
});

it('keeps continuous seated eyes on the same stepped mesh used in the shared renderer',async()=>{
 const d=structuredClone(await loadCircuit('melbourne'));for(const z of d.spectatorZones)if(source.zones.some(s=>s.zoneId===z.zoneId))z.availability='available';
 const r=createCircuitContext(d),material=new MeshBasicMaterial({side:DoubleSide});let count=0;
 for(const z of source.zones){const s=r.spectators.zoneSurfaces.get(z.zoneId)![0],mesh=new Mesh(r.spectators.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
   const pick={zoneId:z.zoneId,tier:'lower' as const,u,v},eye=r.observer(pick),floor=r.observerFloor(pick);
   expect(eye.y-floor.y).toBeCloseTo(1.2,7);
   const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
   expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);count++;
  }mesh.geometry.dispose();
 }material.dispose();expect(count).toBe(171);
});
