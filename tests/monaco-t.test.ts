import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/monaco-t-2026.json';

it('retains the full ordinary T1-T3 envelope while excluding the explicit VIP band',()=>{
 expect(source.sourcePathIndex).toBe(5572);expect(source.excludedVipPathIndex).toBe(5631);
 expect(source.sourceOrdinaryAreaPixels2+source.sourceExcludedVipAreaPixels2).toBeCloseTo(source.sourceOuterAreaPixels2,6);
 expect(source.sourceVipIntersectionPixels2).toBe(0);expect(source.vipWorldIntersectionMetres2).toBe(0);
 expect(source.roadIntersectionMetres2).toBe(0);expect(source.oldCurrentRoadIntersectionMetres2).toBeGreaterThan(2);
 expect(source.otherIntersections).toEqual([]);expect(source.sourceCurveFlatteningMaxDeviationPixels).toBeLessThan(.01);
 expect(source.sourceCapStraighteningMaxDeviationPixels).toBeLessThan(.1);expect(source.registration.minimumSampledJacobian).toBeGreaterThan(0);
});

it('keeps end-cap picks, seated eyes and the shared mesh consistent; VIP cannot be picked',async()=>{
 const d=await loadCircuit('monaco');if(source.zone.availability==='available')expect(d.spectatorZones.find(z=>z.zoneId==='t-rascasse')!.boundary).toEqual(source.zone.boundary);
 const candidate={...source.zone,availability:'available'} as typeof d.spectatorZones[number];
 const ctx=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId==='t-rascasse'?candidate:z)}),model=ctx.spectators,surface=model.zoneSurfaces.get('t-rascasse')![0];
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(model.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
 for(const u of [.01,.05,.2,.5,.8,.95,.99])for(const v of [.05,.5,.95]){
  const floor=model.surfacePoint(surface,u,v,false),eye=model.surfacePoint(surface,u,v,true),pick=model.selectionAt(surface,floor);
  expect(eye.y-floor.y).toBeCloseTo(1.2,7);expect(model.zonePoint('t-rascasse',pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
  const front=model.surfacePoint(surface,u,0),back=model.surfacePoint(surface,u,1),target=model.facingTarget('t-rascasse',u,v);
  expect(front.clone().sub(back).setY(0).normalize().dot(target.clone().sub(floor).setY(0).normalize())).toBeGreaterThan(.5);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
  expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
 }
 const g=ctx.geometry,[lon,lat]=source.vipInteriorProbeCoordinate,p=new Vector3((lon-g.origin[0])*111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration,1000,-(lat-g.origin[1])*111320*g.calibration);
 expect(new Raycaster(p,new Vector3(0,-1,0)).intersectObject(mesh)).toHaveLength(0);
 mesh.geometry.dispose();material.dispose();
});
