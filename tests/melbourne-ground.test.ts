import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/asia/melbourne-ground.json';

it('keeps dated mound fill paths and the actual lakeside stroke separate from full park access',()=>{
 expect(source.archiveTimestamp).toBe('20260304152734');
 expect(source.archiveSha1).toBe('RVQKIRTHOR3XN5VW54Z6CIEUHBK7GEZF');
 expect(source.areas.map(a=>a.pdfClipIndex)).toEqual([5154,5605,6506,7858,7407]);
 const lakeside=source.areas[4];expect(lakeside.pdfStroke?.widthPoints).toBe(2.432);
 expect(lakeside.pdfStroke?.paintOperator).toBe('S');expect(lakeside.pdfStroke?.lineCap).toBe('butt');
 expect(lakeside.pdfCenterline?.[0]).not.toEqual(lakeside.pdfCenterline?.at(-1));
 const line=lakeside.pdfCenterline!,ring=lakeside.pdfOutline;
 const length=line.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-line[i][0],p[1]-line[i][1]),0);
 const area=Math.abs(ring.slice(1).reduce((n,p,i)=>n+ring[i][0]*p[1]-p[0]*ring[i][1],0))/2;
 // Check the actual PDF stroke width before schematic world registration;
 // an arbitrary world-area threshold would depend on local map distortion.
 expect(area/length).toBeCloseTo(2.432,2);
 expect(source.inventoryComplete).toBe(false);
 expect(source.registration.globalAffineRmsMetres).toBeGreaterThan(20);
 for(const a of source.areas){expect(a.pdfOutline[0]).toEqual(a.pdfOutline.at(-1));expect(a.usableAreaMetres2).toBeGreaterThan(0);expect(a.usableAreaMetres2-a.sourceAreaMetres2).toBeLessThan(1e-6)}
});

it('places standing eyes above the actual triangulated mound floor at continuous points',async()=>{
 const d=structuredClone(await loadCircuit('melbourne'));for(const z of d.spectatorZones)if(z.zoneId.startsWith('park-pass-'))z.availability='available';
 const r=createCircuitContext(d),material=new MeshBasicMaterial({side:DoubleSide});let samples=0;
 for(const zone of source.zones)for(const surface of r.spectators.zoneSurfaces.get(zone.zoneId)!){
  const mesh=new Mesh(r.spectators.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
  for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
   const floor=r.spectators.surfacePoint(surface,u,v),pick=r.spectators.selectionAt(surface,floor),eye=r.observer(pick);
   expect(eye.y-floor.y).toBeCloseTo(1.65,7);
   const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
   expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);samples++;
  }mesh.geometry.dispose();
 }material.dispose();expect(samples).toBe(225);
});
