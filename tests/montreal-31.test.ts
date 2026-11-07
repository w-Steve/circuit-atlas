import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector2,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/americas/montreal-31-2026.json';
import width from '../src/circuits/americas/montreal-width-reference-2026.json';

it('uses the published reference width and direct public-map footprint without moving it',async()=>{
 const d=await loadCircuit('montreal');expect(d.trackGeometry.widthMetres).toBe(10);expect(d.trackGeometry.widthSource).toEqual(width.source);
 expect(width.previousWidthMetres).toBe(14);expect(source.zone.boundary).toEqual(source.sourceBoundary);
 expect(source.sourceFeatureId).toBe('7229b7ff-c0c3-419e-8c7b-2d1e1f4b9a6d');expect(source.annualEvidence.welcomeLogoObservedYear).toBe(2026);
 expect(source.annualEvidence.packageLinks).toHaveLength(2);expect(source.sourceStyleExtrusionHeightIgnored).toBe(0);
 expect(source.roadIntersectionMetres2).toBe(0);expect(source.otherIntersections).toEqual([]);
 expect(source.oldCurrentRoadIntersectionMetres2).toBeGreaterThan(130);expect(source.sourcePolygonAgainstOld14mRoadMetres2).toBe(0);
 expect(d.dataSources.some(s=>s.notes.includes('雪邦'))).toBe(false);
});
it('uses the sourced straight T8-facing front and does not invent a second bank from duplicate metadata',async()=>{
 expect(source.identityEvidence.sourceTenantIds).toHaveLength(2);expect(source.identityEvidence.sourceBoundaryParts).toBe(1);expect(source.identityEvidence.orphanOccurrences).toBe(1);expect(source.zone.surfaces).toHaveLength(1);
 const d=await loadCircuit('montreal'),zone={...source.zone,availability:'available'} as typeof d.spectatorZones[number];
 const rt=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId===zone.zoneId?zone:z)}),s=rt.spectators.zoneSurfaces.get(zone.zoneId)![0];
 expect(zone.surfaces[0].rowFrontEdge!.coordinates).toEqual([source.sourceBoundary[22],source.sourceBoundary[23]]);
 expect(zone.surfaces[0].frontReference).toEqual(d.corners.find(c=>c.number===8)!.coordinate);
 const [a,b]=[s.points[22],s.points[23]],edge=b.clone().sub(a).normalize();expect(Math.abs(s.axis.dot(edge))).toBeGreaterThan(.999999);
 const [lon,lat]=zone.surfaces[0].frontReference!,g=rt.geometry,target=new Vector2((lon-g.origin[0])*111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration,-(lat-g.origin[1])*111320*g.calibration);
 expect(target.sub(s.center).normalize().dot(s.normal.clone().multiplyScalar(s.frontSign))).toBeGreaterThan(.8);
});
it('keeps eighteen seated eyes, inverse picks and default bearings on the shared31 mesh',async()=>{
 const d=await loadCircuit('montreal');if(source.zone.availability==='available')expect(d.spectatorZones.find(z=>z.zoneId==='grandstand-31')).toEqual(source.zone);
 const candidate={...source.zone,availability:'available'} as typeof d.spectatorZones[number];
 const model=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId==='grandstand-31'?candidate:z)}).spectators,surface=model.zoneSurfaces.get('grandstand-31')![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(model.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
 for(const u of [.05,.2,.4,.6,.8,.95])for(const v of [.05,.5,.95]){
  const floor=model.surfacePoint(surface,u,v,false),eye=model.surfacePoint(surface,u,v,true),pick=model.selectionAt(surface,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,7);expect(model.zonePoint('grandstand-31',pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
  const front=model.surfacePoint(surface,u,0),back=model.surfacePoint(surface,u,1),target=model.facingTarget('grandstand-31',u,v);
  expect(front.clone().sub(back).setY(0).normalize().dot(target.clone().sub(floor).setY(0).normalize())).toBeGreaterThan(.5);
 }
 mesh.geometry.dispose();material.dispose();
});
