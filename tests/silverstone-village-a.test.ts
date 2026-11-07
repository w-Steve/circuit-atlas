import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
import source from '../src/circuits/europe/silverstone-village-a-2026.json';

it('uses the named building=yes footprint missed by the old grandstand-only query',()=>{
 expect(source.sourceOsmWay).toBe(227342451);expect(source.sourceTags).toEqual({building:'yes',name:'Village A'});
 expect(source.sourceBoundary).toHaveLength(5);expect(source.zone.boundary).toEqual(source.sourceBoundary);
 expect(source.roadIntersectionMetres2).toBeLessThan(1e-6);expect(source.otherIntersections).toEqual([]);expect(source.oldRoadIntersectionMetres2).toBeGreaterThan(40);
 const [i,j]=source.frontEdgeIndices;expect(source.zone.surfaces[0].rowFrontEdge.coordinates).toEqual([source.sourceBoundary[i],source.sourceBoundary[j]]);
 expect(source.zone.surfaces[0]).toMatchObject({rows:22,rise:11.04,baseHeight:2.2,eyeHeight:1.2});
});
it('keeps seated eyes on the native front-aligned physical steps through continuous picking',async()=>{
 const d=await loadCircuit('silverstone'),zone={...source.zone,availability:'available'} as CircuitPackage['spectatorZones'][number];
 const r=createCircuitContext({...d,spectatorZones:[...d.spectatorZones.filter(z=>z.zoneId!==zone.zoneId),zone]}),m=r.spectators,s=m.zoneSurfaces.get(zone.zoneId)![0];
 const g=m.surfaceGeometry(s,p=>r.geometry.groundAt!(p.x,p.y)-.15),mat=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(g,mat);mesh.updateMatrixWorld(true);
 for(const u of [.05,.2,.5,.8,.95])for(const v of [.05,.5,.95]){
  const floor=m.surfacePoint(s,u,v),eye=m.surfacePoint(s,u,v,true),pick=m.selectionAt(s,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,7);expect(m.zonePoint(zone.zoneId,pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
  expect(m.surfacePoint(s,u,0).sub(m.surfacePoint(s,u,1)).setY(0).normalize().dot(m.facingTarget(zone.zoneId,u,v).sub(floor).setY(0).normalize())).toBeGreaterThan(.5);
 }
 g.dispose();mat.dispose();
});

it('publishes only the accepted native source and keeps an unaccepted fixture closed',async()=>{
 const data=await loadCircuit('silverstone');expect(data.spectatorZones.find(z=>z.zoneId==='village-a')).toEqual(source.zone);expect(source.sceneAcceptance.accepted).toBe(true);
 expect(createCircuitContext(data).spectators.spectatorZones.some(z=>z.zoneId==='village-a')).toBe(true);
 const held=structuredClone(data);held.spectatorZones.find(z=>z.zoneId==='village-a')!.availability='preparing';
 expect(createCircuitContext(held).spectators.spectatorZones.some(z=>z.zoneId==='village-a')).toBe(false);
});
