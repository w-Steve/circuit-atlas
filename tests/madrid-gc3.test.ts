import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/madrid-gc3-2026.json';

it('uses final2026 GC3–GC5 curved source edges without road or other-bank intersections',async()=>{
 const d=await loadCircuit('madrid'),z=d.spectatorZones.find(z=>z.zoneId==='t4t5')!;
 expect(z.name).toBe('GC3–GC5 看台');expect(z.boundary).toEqual(source.zone.boundary);
 expect(source.sourceRoadPixels.length).toBeGreaterThan(20);expect(source.roadCornerNumbers).toEqual([4,5]);expect(source.sourceRoadFitRmsPixels).toBeLessThan(.51);
 expect(source.roadIntersectionMetres2).toBe(0);expect(source.otherIntersections).toEqual([]);
 expect(z.surfaces![0].rowStrip!.front).toHaveLength(110);expect(z.surfaces![0].rowStrip!.back).toHaveLength(110);
 expect(z.surfaces![0].rows!*.85).toBeLessThanOrEqual(source.minimumDepthMetres);
 expect(z.surfaces![0].baseHeight).toBe(source.oldZone.surfaces[0].baseHeight);expect(z.surfaces![0].eyeHeight).toBe(1.2);
});
it('keeps eighteen seated eyes on the actual GC3–GC5 mesh with reversible continuous selection',async()=>{
 const d=await loadCircuit('madrid'),m=createCircuitContext(d).spectators,s=m.zoneSurfaces.get('t4t5')![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
 for(const u of [.05,.2,.4,.6,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.zonePoint('t4t5',u,v,false),eye=m.zonePoint('t4t5',u,v),pick=m.selectionAt(s,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(m.zonePoint('t4t5',pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
 }
 mesh.geometry.dispose();material.dispose();
});
