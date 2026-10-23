import { Object3D, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { cockpitAt, placeVehicle, type VehicleSimulation } from "../systems/VehicleSimulation";

export const shutterSpeeds = [60,125,250,500,1000,2000,4000] as const;
export type PanMode = "fixed" | "tracking";
export interface ExposureMoment {
  distance:number; velocity:number; simulationSeconds:number;
  rangeStart:number; rangeEnd:number;
  position:Vector3; quaternion:Quaternion;
  seconds:number; pan:PanMode;
}
export function freezeMoment(simulation:VehicleSimulation,camera:PerspectiveCamera,denominator:number,pan:PanMode):ExposureMoment {
  if(!shutterSpeeds.includes(denominator as typeof shutterSpeeds[number]))throw Error('Invalid shutter speed');
  return {distance:simulation.distance,velocity:simulation.status==='running'?simulation.speed/3.6:0,
    simulationSeconds:simulation.elapsedSeconds,rangeStart:simulation.rangeStart,rangeEnd:simulation.rangeEnd,
    position:camera.getWorldPosition(new Vector3()),quaternion:camera.getWorldQuaternion(new Quaternion()),seconds:1/denominator,pan};
}
export function sampleTimes(seconds:number,count:number){
  if(!Number.isFinite(seconds)||seconds<=0||!Number.isInteger(count)||count<1)throw Error('Invalid exposure samples');
  return Array.from({length:count},(_,i)=>((i+.5)/count-.5)*seconds);
}
export function sampleDistance(moment:ExposureMoment,time:number){
  return Math.max(moment.rangeStart,Math.min(moment.rangeEnd,moment.distance+moment.velocity*time));
}
export function exposureQuaternion(moment:ExposureMoment,time:number){
  if(moment.pan==='fixed'||moment.velocity===0)return moment.quaternion.clone();
  const initial=cockpitAt(moment.distance).sub(moment.position).normalize();
  const sampled=cockpitAt(sampleDistance(moment,time)).sub(moment.position).normalize();
  return new Quaternion().setFromUnitVectors(initial,sampled).multiply(moment.quaternion);
}
export function sampleCount(moment:ExposureMoment,camera:PerspectiveCamera,outputHeight:number,maxSamples:number){
  if(moment.velocity===0)return 1;
  const first=cockpitAt(sampleDistance(moment,-moment.seconds/2)).sub(moment.position).normalize();
  const last=cockpitAt(sampleDistance(moment,moment.seconds/2)).sub(moment.position).normalize();
  const pixels=first.angleTo(last)*outputHeight/(2*Math.tan(camera.fov*Math.PI/360));
  return Math.max(4,Math.min(maxSamples,Math.ceil(pixels/1.5)+1));
}
// Each sample borrows the actual mesh; no simulation variables or scale change.
// Restoration also occurs if rendering/readback fails.
export function withVehicleSample<T>(vehicle:Object3D,distance:number,render:()=>T):T {
  const position=vehicle.position.clone(),quaternion=vehicle.quaternion.clone();
  try {placeVehicle(vehicle,distance);return render()}
  finally {vehicle.position.copy(position);vehicle.quaternion.copy(quaternion);vehicle.updateMatrixWorld(true)}
}
export const srgbToLinear=Float32Array.from({length:256},(_,i)=>{
  const x=i/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
});
const linearToSrgb=Uint8Array.from({length:65537},(_,i)=>{
  const x=i/65536;return Math.round(255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055));
});
export const linearByte=(value:number)=>linearToSrgb[Math.max(0,Math.min(65536,Math.round(value*65536)))];
