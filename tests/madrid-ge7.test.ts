import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/madrid-ge7-2026.json';

it('uses final2026 GE7–GE13 curved source edges without road or other-bank intersections',async()=>{
 const d=await loadCircuit('madrid'),z=d.spectatorZones.find(z=>z.zoneId==='monumental')!;
 expect(z.name).toBe('GE7–GE13 看台');expect(z.boundary).toEqual(source.zone.boundary);
 expect(source.sourceRoadSamples.length).toBeGreaterThan(20);expect(source.roadCornerNumbers).toEqual([11,12,13]);expect(source.sourceRoadFitRmsPixels).toBeLessThan(.51);
 expect(source.roadIntersectionMetres2).toBe(0);expect(source.otherIntersections).toEqual([]);
 expect(z.surfaces![0].rowBearing).toBe('local-normal');expect(z.admissionNote).toContain('跨分区');
 expect(source.unmodeledFacility.symbol).toBe('live-screen');expect(source.unmodeledFacility.heightMetres).toBeNull();
 expect(z.surfaces![0].rowStrip!.front).toHaveLength(110);expect(z.surfaces![0].rowStrip!.back).toHaveLength(110);
 expect(z.surfaces![0].rows!*.85).toBeLessThanOrEqual(source.minimumDepthMetres);
 expect(z.surfaces![0].baseHeight).toBe(source.oldZone.surfaces[0].baseHeight);expect(z.surfaces![0].eyeHeight).toBe(1.2);
});
it('keeps eighteen seated eyes on the actual GE7–GE13 mesh with reversible continuous selection',async()=>{
 const d=await loadCircuit('madrid'),m=createCircuitContext(d).spectators,s=m.zoneSurfaces.get('monumental')![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
 for(const u of [.05,.2,.4,.6,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.zonePoint('monumental',u,v,false),eye=m.zonePoint('monumental',u,v),pick=m.selectionAt(s,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(m.zonePoint('monumental',pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const front=m.surfacePoint(s,u,0),back=m.surfacePoint(s,u,1),target=m.facingTarget('monumental',u,v);
  expect(front.clone().sub(back).setY(0).normalize().dot(target.clone().sub(floor).setY(0).normalize())).toBeGreaterThan(.5);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
 }
 mesh.geometry.dispose();material.dispose();
});
