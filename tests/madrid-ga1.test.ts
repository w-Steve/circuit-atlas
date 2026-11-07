import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/madrid-ga1-2026.json';
it('uses final2026 GA1 outline and observed road controls while retaining estimated seated height',async()=>{
 const d=await loadCircuit('madrid'),z=d.spectatorZones.find(z=>z.zoneId==='stand-1')!;
 expect(z.boundary).toEqual(source.zone.boundary);expect(z.kind).toBe('grandstand');
 expect(source.sourceRoadMedialPixels).toHaveLength(52);expect(source.sourceRoadFitRmsPixels).toBeLessThan(1);
 expect(source.roadIntersectionMetres2).toBe(0);expect(source.withheldConflicts.every(x=>x.availability==='preparing')).toBe(true);
 for(const k of ['baseHeight','rise','rows','eyeHeight'] as const)expect(z.surfaces![0][k]).toBe(source.oldZone.surfaces[0][k]);
});
it('keeps eighteen GA1 seated eyes on the rendered bank with continuous reversible picks',async()=>{
 const d=await loadCircuit('madrid'),m=createCircuitContext(d).spectators,s=m.zoneSurfaces.get('stand-1')![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
 for(const u of [.05,.2,.4,.6,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.zonePoint('stand-1',u,v,false),eye=m.zonePoint('stand-1',u,v),pick=m.selectionAt(s,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(m.zonePoint('stand-1',pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
 }
 mesh.geometry.dispose();material.dispose();
});
