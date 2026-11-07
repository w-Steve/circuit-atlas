import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/madrid-ge24-2026.json';

it('distinguishes the final2026 GE24 seated envelope from its former Fan Zone rectangle',async()=>{
 const d=await loadCircuit('madrid'),z=d.spectatorZones.find(z=>z.zoneId==='stand-7')!;
 expect(z.name).toBe('GE24 看台');expect(z.boundary).toEqual(source.zone.boundary);
 expect(source.sourceRoadPixels.length).toBeGreaterThan(20);expect(source.roadCornerNumbers).toEqual([15,14]);expect(source.sourceRoadFitRmsPixels).toBeLessThan(.51);
 expect(source.roadIntersectionMetres2).toBe(0);expect(source.otherIntersections).toEqual([]);
 expect(source.previousMisidentification.sourcePixelCentre).toEqual([689,214]);expect(source.oldZone.name).toBe('北区入口看台');
 expect(source.unmodeledAdjacentPublicAreas).toHaveLength(2);expect(source.unmodeledAdjacentPublicAreas.every(a=>a.boundary===null&&a.kind==='general-admission')).toBe(true);
 expect(z.surfaces![0].rowStrip!.front).toHaveLength(110);expect(z.surfaces![0].rowStrip!.back).toHaveLength(110);
 expect(z.surfaces![0].rows!*.85).toBeLessThanOrEqual(source.minimumDepthMetres);
 expect(z.surfaces![0].baseHeight).toBe(source.oldZone.surfaces[0].baseHeight);expect(z.surfaces![0].eyeHeight).toBe(1.2);
});
it('keeps eighteen seated eyes on the actual GE24 mesh with reversible continuous selection',async()=>{
 const d=await loadCircuit('madrid'),m=createCircuitContext(d).spectators,s=m.zoneSurfaces.get('stand-7')![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
 for(const u of [.05,.2,.4,.6,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.zonePoint('stand-7',u,v,false),eye=m.zonePoint('stand-7',u,v),pick=m.selectionAt(s,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(m.zonePoint('stand-7',pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
 }
 mesh.geometry.dispose();material.dispose();
});
