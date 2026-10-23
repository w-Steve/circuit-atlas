import {it,expect,afterEach} from 'vitest';
import {Vector3,Group,PerspectiveCamera} from 'three';
import {circuitRegions,europeanCircuits} from '../src/circuits/regions';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {mapRoad} from '../src/circuits/mapRoad';
import {circuitRuntime} from '../src/circuits/runtime';
import {placeVehicle,cockpitAt,VehicleSimulation} from '../src/systems/VehicleSimulation';
import {observer} from '../src/systems/GrandstandGeometry';
import {freezeMoment,exposureQuaternion,sampleDistance,withVehicleSample} from '../src/camera/Exposure';
import {useApp} from '../src/store';
import {facilities} from '../src/data/config';
afterEach(()=>{circuitRuntime.current=null;useApp.getState().activateCircuit('shanghai')});
it('region partition covers each actual circuit once',()=>{
 const ids=circuitRegions.flatMap(g=>[...g.circuits]);expect(new Set(ids).size).toBe(23);expect(ids.sort()).toEqual(circuitRegistry.map(c=>c.circuitId).sort());
});
for(const id of europeanCircuits)it(id+': all spectator surfaces select finite continuous metric points and follow the local road',async()=>{
 const data=await loadCircuit(id),geometry=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation),model=createSpectators(data.spectatorZones,geometry);
 expect(data.simulationAvailability).toBe('available');expect(data.spectatorZones.length).toBeGreaterThan(5);
 expect(new Set(data.spectatorZones.map(z=>z.zoneId)).size).toBe(data.spectatorZones.length);
 for(const zone of data.spectatorZones){
  expect(zone.source.url).toMatch(/^https:/);expect(zone.source.checkedAt).toBe('2026-10-23');expect(zone.surfaceSource?.confidence).toBe('low');
  if(zone.availability!=='available'){
   expect(zone.geometryReview?.issues.length).toBeGreaterThan(0);
   expect(model.zoneSurfaces.has(zone.zoneId)).toBe(false);
   expect(()=>model.zonePoint(zone.zoneId,.5,.5)).toThrow();
   continue;
  }
  for(const u of [.02,.25,.5,.75,.98])for(const v of [0,.4,.9]){
   const p=model.zonePoint(zone.zoneId,u,v),floor=model.zonePoint(zone.zoneId,u,v,false);
   expect(p.toArray().every(Number.isFinite)).toBe(true);expect(p.y-floor.y).toBeCloseTo(1.2,6);
   const nearest=model.nearestTrack(p);expect(Math.hypot(nearest.point.x-p.x,nearest.point.z-p.z)).toBeLessThan(400);
  }
  for(const surface of model.zoneSurfaces.get(zone.zoneId)!){
   const geo=model.surfaceGeometry(surface);expect(geo.getAttribute('position').count).toBeGreaterThan(0);geo.dispose();
   const p=model.surfacePoint(surface,.37,.53),selection=model.selectionAt(surface,p);
   expect(model.zonePoint(zone.zoneId,selection.u,selection.v,false).distanceTo(p)).toBeLessThan(1e-5);
  }
 }
 circuitRuntime.current={data,geometry,spectators:model};
 const vehicle=new Group();
 const pavement=mapRoad(geometry,data.trackGeometry.widthMetres,.2);placeVehicle(vehicle,0);
 expect(vehicle.position.y-pavement.road.getAttribute('position').getY(0)).toBeCloseTo(.02,5);
 pavement.road.dispose();pavement.verge.dispose();
 for(const fraction of [0,.13,.51,.89]){
  const distance=geometry.length*fraction;placeVehicle(vehicle,distance);
  expect(vehicle.position.distanceTo(geometry.at(distance).add(new Vector3(0,.22,0)))).toBeLessThan(1e-8);
  expect(new Vector3(0,0,1).applyQuaternion(vehicle.quaternion).angleTo(geometry.tangent(distance))).toBeLessThan(1e-6);
  expect(cockpitAt(distance).distanceTo(vehicle.localToWorld(new Vector3(0,facilities.car.cockpitHeight,facilities.car.cockpitOffset)))).toBeLessThan(1e-8);
 }
 const first=model.spectatorZones[0];expect(observer({zoneId:first.zoneId,tier:'lower',u:.5,v:.5}).distanceTo(model.zonePoint(first.zoneId,.5,.5))).toBe(0);
});
it('circuit switches isolate observer selection and preserve Shanghai',()=>{
 const app=useApp.getState();app.activateCircuit('shanghai');app.chooseZone('b');app.setZoom(5);app.setShutterSpeed(125);app.select({zoneId:'b',tier:'lower',u:.3,v:.7});
 app.activateCircuit('silverstone','copse-a');useApp.getState().select({zoneId:'copse-a',tier:'lower',u:.8,v:.2});
 app.activateCircuit('monaco','a-sainte-devote');expect(useApp.getState().selection.zoneId).toBe('a-sainte-devote');
 app.activateCircuit('silverstone');expect(useApp.getState().selection.u).toBe(.8);
 app.activateCircuit('shanghai');expect(useApp.getState().zoom).toBe(5);expect(useApp.getState().shutterSpeed).toBe(125);expect(useApp.getState().selection).toEqual({zoneId:'b',tier:'lower',u:.3,v:.7});
});

it('Spa exposure follows the sloped cockpit and restores a parked mesh without rotating it',async()=>{
 const data=await loadCircuit('spa'),geometry=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation),spectators=createSpectators(data.spectatorZones,geometry);
 circuitRuntime.current={data,geometry,spectators};
 const simulation=new VehicleSimulation(),center=spectators.zonePassCenter(data.spectatorZones[2].zoneId);simulation.setPassRange(center-350,center+450);simulation.distance=center;simulation.setSpeed(340);simulation.play();
 const camera=new PerspectiveCamera(10,4/3,.1,20000);camera.position.copy(spectators.zonePoint(data.spectatorZones[2].zoneId,.5,.8));camera.lookAt(cockpitAt(center));camera.updateMatrixWorld(true);
 const moment=freezeMoment(simulation,camera,60,'tracking'),vehicle=new Group();placeVehicle(vehicle,center);const before=vehicle.quaternion.clone(),position=vehicle.position.clone();
 for(const time of [-1/120,0,1/120]){
  const sampled=camera.clone();sampled.quaternion.copy(exposureQuaternion(moment,time));sampled.updateMatrixWorld(true);
  const point=cockpitAt(sampleDistance(moment,time)).project(sampled);expect(Math.hypot(point.x,point.y)).toBeLessThan(1e-8);
  withVehicleSample(vehicle,sampleDistance(moment,time),()=>expect(vehicle.position.toArray().every(Number.isFinite)).toBe(true));
  expect(vehicle.quaternion.angleTo(before)).toBeLessThan(1e-7);expect(vehicle.position.distanceTo(position)).toBe(0);
 }
 expect(simulation.distance).toBe(center);
});
