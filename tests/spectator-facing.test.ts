import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {terrainSpectatorZones} from '../src/circuits/spectatorDatum';

for(const [id,zoneId] of [['monaco','l-piscine'],['spielberg','mitte'],['melbourne','prost'],['madrid','t11']]){
 it(`${id}/${zoneId}: default aim crosses the seat's front instead of adjacent rows`,async()=>{
  const d=await loadCircuit(id),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),model=createSpectators(terrainSpectatorZones(d),g);
  const s=model.zoneSurfaces.get(zoneId)![0],snapshot=s.points.map(p=>p.toArray()),mesh=new Mesh(model.surfaceGeometry(s),new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld(true);
  for(const u of [.05,.5,.95]){
   const front=model.surfacePoint(s,u,0),target=model.facingTarget(zoneId,u,.5);
   // It is the same physical row bearing at the front and back of the stand.
   expect(model.facingTarget(zoneId,u,.05).distanceTo(target)).toBeLessThan(.001);
   expect(model.facingTarget(zoneId,u,.95).distanceTo(target)).toBeLessThan(.001);
   expect(Math.abs((target.x-front.x)*s.axis.x+(target.z-front.z)*s.axis.y)).toBeLessThan(.001);
   expect(model.nearestTrack(target).point.distanceTo(target)).toBeLessThan(.04);
   for(const v of [.05,.5,.95]){
    const eye=model.zonePoint(zoneId,u,v),floor=model.zonePoint(zoneId,u,v,false),look=target.clone().add(new Vector3(0,.9,0));
    expect(eye.y-floor.y).toBeCloseTo(1.2,7);
    expect(new Raycaster(eye,look.clone().sub(eye).normalize(),.05,eye.distanceTo(look)-.05).intersectObject(mesh)).toHaveLength(0);
   }
  }
  expect(s.points.map(p=>p.toArray())).toEqual(snapshot);expect(g.length).toBeCloseTo(d.lengthMetres,3);
  mesh.geometry.dispose();mesh.material.dispose();
 });
}
