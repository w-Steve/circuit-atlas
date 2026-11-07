import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/monaco-rocher-world-candidate-2026.json';
import controls from '../src/circuits/europe/monaco-rocher-controls-2026.json';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

it('binds candidate geographic targets to the current source controls without claiming image correspondence acceptance',()=>{
 expect(source.controlsSha256).toBe(createHash('sha256').update(readFileSync('src/circuits/europe/monaco-rocher-controls-2026.json')).digest('hex'));
 expect(controls.independentControlCheckAccepted).toBe(false);
 expect(source.controls.slice(0,3).map(c=>c.osmNodeId)).toEqual(['1866423016','1868334418','25181806']);
 expect(source.controls[2].coordinate).toEqual([7.4223806,43.7299372]);
});

it('keeps the four-part Rocher candidate isolated despite passing racing-road checks',async()=>{
 const d=await loadCircuit('monaco');expect(d.spectatorZones.find(z=>z.zoneId==='rocher')?.availability).toBe('available');
 expect(source.zone.availability).toBe('preparing');expect(source.sceneAcceptance.accepted).toBe(false);
 expect(source.checks).toHaveLength(4);
 for(const c of source.checks){expect(c.roadIntersectionMetres2).toBe(0);expect(c.extrapolatedVertices).toBe(0);expect(c.foldedTriangles).toBe(0)}
 expect(source.streetCentrelineIntersections.some(s=>s.name==='Avenue de la Porte Neuve'&&s.partIntersectionLengthsMetres.some(n=>n>100))).toBe(true);
 expect(source.zone.geometryReview.issues.some(s=>s.includes('non-racing street'))).toBe(true);
 if(d.spectatorZones.find(z=>z.zoneId==='v-anthony-noghes')?.availability==='available')expect(source.checks.flatMap(c=>c.otherIntersections).some(c=>c.zoneId==='v-anthony-noghes')).toBe(false);
 else expect(source.checks.flatMap(c=>c.otherIntersections).some(c=>c.zoneId==='v-anthony-noghes'&&c.availability==='preparing')).toBe(true);
});
it('uses the shared regional terrain and a standing eye on all four disconnected parts',async()=>{
 const d=await loadCircuit('monaco');const candidate={...source.zone,availability:'available'} as typeof d.spectatorZones[number];
 const model=createCircuitContext({...d,spectatorZones:[...d.spectatorZones.filter(z=>z.zoneId!=='rocher'),candidate]}).spectators;
 const material=new MeshBasicMaterial({side:DoubleSide});const surfaces=model.zoneSurfaces.get('rocher')!;expect(surfaces).toHaveLength(4);
 for(const surface of surfaces){
  expect(surface.definition.terrainFollow).toBe(true);expect(surface.definition.rows).toBe(0);
  const mesh=new Mesh(model.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
  for(const u of [.1,.5,.9])for(const v of [.1,.5,.9]){
   const floor=model.surfacePoint(surface,u,v,false),eye=model.surfacePoint(surface,u,v,true),pick=model.selectionAt(surface,floor);
   expect(eye.y-floor.y).toBeCloseTo(1.65,7);expect(model.zonePoint('rocher',pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
   const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
   expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
  }
  mesh.geometry.dispose();
 }
 material.dispose();
});
