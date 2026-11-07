import { it,expect } from "vitest";
import { Group,PerspectiveCamera,Vector3 } from "three";
import { freezeMoment,sampleTimes,sampleDistance,exposureQuaternion,withVehicleSample,srgbToLinear,linearByte,sampleCount } from "../src/camera/Exposure";
import { VehicleSimulation,cockpitAt,placeVehicle } from "../src/systems/VehicleSimulation";
import { at,tangent } from "../src/systems/CircuitGeometry";
function context(){
  const simulation=new VehicleSimulation();simulation.distance=simulation.rangeStart+350;simulation.play();
  const target=cockpitAt(simulation.distance),camera=new PerspectiveCamera(20,4/3,.1,12000);
  camera.position.copy(target).add(new Vector3(45,10,15));camera.lookAt(target.clone().add(new Vector3(2,0,0)));camera.updateMatrixWorld(true);
  return {simulation,camera};
}
it('uses centered real exposure times and larger physical travel for slower shutters',()=>{
  const {simulation,camera}=context();
  for(const count of [4,16,48]){
    const times=sampleTimes(1/60,count);expect(times.reduce((a,b)=>a+b,0)).toBeCloseTo(0,12);
    expect(times[0]).toBeCloseTo(-times.at(-1)!,12);
    const slow=freezeMoment(simulation,camera,60,'fixed',{cockpitAt,placeVehicle}),fast=freezeMoment(simulation,camera,4000,'fixed',{cockpitAt,placeVehicle});
    expect((sampleDistance(slow,slow.seconds/2)-sampleDistance(slow,-slow.seconds/2))/(sampleDistance(fast,fast.seconds/2)-sampleDistance(fast,-fast.seconds/2))).toBeCloseTo(4000/60,6);
    expect(sampleDistance(slow,1/120)-slow.distance).toBeCloseTo(200/3.6/120,6);
  }
});
it('ideal panning preserves the existing off-center cockpit projection and moves the background',()=>{
  const {simulation,camera}=context(),moment=freezeMoment(simulation,camera,60,'tracking',{cockpitAt,placeVehicle});
  const original=cockpitAt(moment.distance).project(camera),background=at(moment.distance+180).project(camera);
  for(const t of [-1/120,1/120]){
    const sampled=camera.clone();sampled.quaternion.copy(exposureQuaternion(moment,t));sampled.updateMatrixWorld(true);
    const projected=cockpitAt(sampleDistance(moment,t)).project(sampled);
    expect(projected.x).toBeCloseTo(original.x,9);expect(projected.y).toBeCloseTo(original.y,9);
    expect(at(moment.distance+180).project(sampled).distanceTo(background)).toBeGreaterThan(.001);
  }
  const fixed={...moment,pan:'fixed' as const};expect(exposureQuaternion(fixed,1/120).angleTo(moment.quaternion)).toBeCloseTo(0,8);
});
it('paused scenes have zero relative motion and snapshots do not follow later simulation changes',()=>{
  const {simulation,camera}=context();simulation.pause();
  const moment=freezeMoment(simulation,camera,60,'tracking',{cockpitAt,placeVehicle});expect(moment.velocity).toBe(0);
  expect(sampleCount(moment,camera,1200,48)).toBe(1);
  const distance=moment.distance;simulation.play();simulation.advance(1);
  expect(sampleDistance(moment,1/120)).toBe(distance);
  expect(exposureQuaternion(moment,1/120).angleTo(moment.quaternion)).toBeCloseTo(0,8);
  expect(simulation.elapsedSeconds).toBeCloseTo(1,8);
});
it('borrows the real vehicle pose and always restores live geometry, including renderer failures',()=>{
  const vehicle=new Group();vehicle.position.set(9,2,5);vehicle.rotation.set(.1,.2,.3);vehicle.scale.set(1.1,1.2,1.3);
  const position=vehicle.position.clone(),q=vehicle.quaternion.clone(),scale=vehicle.scale.clone();
  expect(()=>withVehicleSample(vehicle,100,()=>{
    const expected=at(100).add(new Vector3(0,.22,0));expect(vehicle.position.distanceTo(expected)).toBeLessThan(1e-8);
    expect(vehicle.rotation.y).toBeCloseTo(Math.atan2(tangent(100).x,tangent(100).z),9);
    expect(vehicle.rotation.x).toBeCloseTo(-Math.asin(tangent(100).y),9);
    throw Error('readback failed');
  },placeVehicle)).toThrow('readback failed');
  expect(vehicle.position.equals(position)).toBe(true);expect(vehicle.quaternion.equals(q)).toBe(true);expect(vehicle.scale.equals(scale)).toBe(true);
  const actual=new Group();placeVehicle(actual,100);expect(actual.position.distanceTo(at(100).add(new Vector3(0,.22,0)))).toBe(0);
});
it('averages linear light rather than sRGB bytes and preserves static colors',()=>{
  expect(linearByte((srgbToLinear[0]+srgbToLinear[255])/2)).toBe(188);
  for(let b=0;b<256;b++)expect(Math.abs(linearByte(srgbToLinear[b])-b)).toBeLessThanOrEqual(1);
});
it('keeps parked vehicle orientation stable after quaternion restoration at every track heading',()=>{
  const vehicle=new Group();
  for(let distance=0;distance<5451;distance+=37){
    placeVehicle(vehicle,distance);const before=vehicle.quaternion.clone(),position=vehicle.position.clone();
    for(let shot=0;shot<3;shot++){
      withVehicleSample(vehicle,distance+.5,()=>{},placeVehicle);
      // The live render loop places even paused/ended vehicles on each frame.
      placeVehicle(vehicle,distance);
      expect(1-Math.abs(vehicle.quaternion.dot(before))).toBeLessThan(1e-12);
      expect(vehicle.position.equals(position)).toBe(true);
    }
  }
});
