import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
import source from '../src/circuits/americas/montreal-41a-2026.json';
import access from '../src/circuits/americas/montreal-41a-access-2026.json';
import identity from '../src/circuits/season-review/montreal-public-map-identity-review.json';

it('uses the annual location-linked4-corner accessible footprint and archived rules without inventing stepped rows',()=>{
 expect(access.evidence[0].observedSeason).toBe(2026);
 expect(access.evidence[0].annualHeader).toBe('May 22-23-24 2026');
 expect(access.unassignedSeating).toBe(true);
 expect(access.maximumCompanionsPerSpectatorWithReducedMobility).toBe(1);
 expect(source.sourceLinkMethod).toBe('named-location-featureId');expect(source.sourceLocationId).toBe(access.sourceLocationId);expect(source.sourceFeatureId).toBe(access.sourceFeatureId);expect(access.sourceLocationId).toBe(260533);expect(access.sourceLocationLabel).toBe('Accessible Grandstand 41A');
 expect(source.sourceBoundary).toHaveLength(5);
 expect(source.zone.boundary).toEqual(source.sourceBoundary);
 expect(source.zone.surfaces[0].boundary).toEqual(source.sourceBoundary);
 expect(source.zone.surfaces[0]).toMatchObject({rows:1,rise:0,eyeHeight:1.2});
 expect(source.zone.surfaceSource.method).toBe('estimated');
 expect(source.roadIntersectionMetres2).toBeLessThan(1e-6);
 expect(source.otherIntersections).toEqual([]);
});
it('keeps all continuous seated positions on the same level supported platform facing Turns8–9',async()=>{
 const d=await loadCircuit('montreal'),zone={...source.zone,availability:'available'} as CircuitPackage['spectatorZones'][number];
 const r=createCircuitContext({...d,spectatorZones:[...d.spectatorZones.filter(z=>z.zoneId!==zone.zoneId),zone]}),m=r.spectators,s=m.zoneSurfaces.get(zone.zoneId)![0];
 const g=m.surfaceGeometry(s,p=>r.geometry.groundAt!(p.x,p.y)-.15),mat=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(g,mat);mesh.updateMatrixWorld(true);
 const levels:number[]=[];
 for(const u of [.05,.2,.5,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.surfacePoint(s,u,v),eye=m.surfacePoint(s,u,v,true),pick=m.selectionAt(s,floor);levels.push(floor.y);
  expect(eye.y-floor.y).toBeCloseTo(1.2,7);
  expect(m.zonePoint(zone.zoneId,pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
  // A long platform beside the hairpin has oblique sightlines at its ends;
  // the sourced target must stay in the front hemisphere, not within60deg.
  expect(m.surfacePoint(s,u,0).sub(m.surfacePoint(s,u,1)).setY(0).normalize().dot(m.facingTarget(zone.zoneId,u,v).sub(floor).setY(0).normalize())).toBeGreaterThan(0);
 }
 expect(Math.max(...levels)-Math.min(...levels)).toBeLessThan(1e-7);
 g.dispose();mat.dispose();
});

it('publishes the accepted accessible platform with its own admission rules and retains a closed fixture',async()=>{
 const data=await loadCircuit('montreal');
 expect(data.spectatorZones.find(z=>z.zoneId==='grandstand-41a')).toEqual(source.zone);
 expect(source.zone.availability).toBe('available');expect(source.sceneAcceptance.accepted).toBe(true);
 expect(identity.confirmedIdentities.find(z=>z.zoneId==='grandstand-41a')).toMatchObject({ticketClass:'accessible-grandstand',accessibilityLinked:true,accessReview:access,sourceLocationIds:[260533],sourceFeatureIds:[access.sourceFeatureId],sourceBoundaryParts:1});
 expect(identity.confirmedMissingProducts.some(z=>z.productId==='grandstand-41a')).toBe(false);
 const held=structuredClone(data);held.spectatorZones.find(z=>z.zoneId==='grandstand-41a')!.availability='preparing';
 expect(createCircuitContext(held).spectators.spectatorZones.some(z=>z.zoneId==='grandstand-41a')).toBe(false);
});
