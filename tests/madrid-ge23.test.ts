import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/madrid-ge23-2026.json';
import accepted from '../src/circuits/europe/madrid-remaining-approx-2026.json';

it('uses GE23 source curvature without road or other-region intersections',()=>{
 expect(source.cornerNumbers).toEqual([13,14,15,16]);expect(source.sourceRoadSamples.length).toBeGreaterThan(40);
 expect(source.sourceRoadFitRmsPixels).toBeLessThan(.51);expect(source.roadIntersectionMetres2).toBe(0);
 expect(source.otherIntersections).toEqual([]);expect(source.zone.availability).toBe('preparing');
 expect(source.adjacentRoadRegistration.cornerNumbers).toEqual([8,9]);expect(source.adjacentRoadRegistration.sourceRoadSamples.length).toBeGreaterThan(6);
 expect(source.zone.geometryReview.issues.join(' ')).toContain('admission unresolved');
 expect(source.zone.name).toBe('GE23 看台');expect(source.zone.surfaces[0].baseHeight).toBe(source.oldZone.surfaces[0].baseHeight);
 expect(source.zone.surfaces[0].rows*.85).toBeLessThanOrEqual(source.minimumDepthMetres);
});
it('keeps eighteen GE23 seated eyes and default bearings consistent with the shared curved mesh',async()=>{
 const d=await loadCircuit('madrid');expect(d.spectatorZones.find(z=>z.zoneId==='t13t14')).toEqual(accepted.zones.find(z=>z.zoneId==='t13t14'));expect(d.spectatorZoneIds).toContain('t13t14');
 expect(d.spectatorZones.find(z=>z.zoneId==='t13t14')!.surfaces).toEqual(source.zone.surfaces);
 const candidate={...source.zone,availability:'available'} as typeof d.spectatorZones[number];
 const m=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId==='t13t14'?candidate:z)}).spectators;
 const s=m.zoneSurfaces.get('t13t14')![0],material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
 for(const u of [.05,.2,.4,.6,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.zonePoint('t13t14',u,v,false),eye=m.zonePoint('t13t14',u,v),pick=m.selectionAt(s,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(m.zonePoint('t13t14',pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const front=m.surfacePoint(s,u,0),back=m.surfacePoint(s,u,1),target=m.facingTarget('t13t14',u,v);
  expect(front.clone().sub(back).setY(0).normalize().dot(target.clone().sub(floor).setY(0).normalize())).toBeGreaterThan(.5);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
  expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
 }
 mesh.geometry.dispose();material.dispose();
});
