import {circuitRuntime} from "../circuits/runtime";
import { facilities } from "../data/config";
import { at, tangent, length } from "./CircuitGeometry";
import {Euler,Vector3,type Object3D} from "three";
export function placeVehicle(vehicle:Object3D,distance:number){
  const path=circuitRuntime.current?.geometry;
  vehicle.position.copy((path?.at??at)(distance));
  vehicle.position.y=(path?vehicle.position.y:0)+.22;
  const direction=(circuitRuntime.current?.geometry.tangent??tangent)(distance);
  // Quaternion restoration can produce an equivalent Euler representation with
  // nonzero X/Z (especially beyond +/-90 degrees yaw). Set the whole rotation,
  // otherwise writing only Y on the next paused frame changes the car's heading.
  vehicle.rotation.set(circuitRuntime.current?-Math.asin(Math.max(-1,Math.min(1,direction.y))):0,Math.atan2(direction.x,direction.z),0,circuitRuntime.current?"YXZ":"XYZ");
  vehicle.updateMatrixWorld(true);
}
export function cockpitAt(distance: number) {
  const path=circuitRuntime.current?.geometry;
  if(path){
    const direction=path.tangent(distance),orientation=new Euler(-Math.asin(Math.max(-1,Math.min(1,direction.y))),Math.atan2(direction.x,direction.z),0,'YXZ');
    return new Vector3(0,facilities.car.cockpitHeight,facilities.car.cockpitOffset).applyEuler(orientation).add(path.at(distance)).add(new Vector3(0,.22,0));
  }
  const p=at(distance).addScaledVector(tangent(distance),facilities.car.cockpitOffset);
  p.y=(path?p.y:0)+.22+facilities.car.cockpitHeight;
  return p;
}
export const passStart = length - 620,
  passEnd = length + 100;
export class VehicleSimulation {
  distance = passStart;
  elapsedSeconds=0;
  rangeStart=passStart;
  rangeEnd=passEnd;
  speed = 200;
  status: "ready" | "running" | "paused" | "ended" = "ready";
  advance(seconds: number) {
    if (this.status !== "running" || !Number.isFinite(seconds) || seconds <= 0)
      return;
    const previous=this.distance;
    this.distance = Math.min(
      this.rangeEnd,
      this.distance + (this.speed / 3.6) * seconds,
    );
    this.elapsedSeconds+=(this.distance-previous)/(this.speed/3.6);
    if (this.distance === this.rangeEnd) this.status = "ended";
  }
  play() {
    if (this.status !== "ended") this.status = "running";
  }
  pause() {
    if (this.status === "running") this.status = "paused";
  }
  replay() {
    this.distance = this.rangeStart;
    this.elapsedSeconds=0;
    this.status = "ready";
  }
  setSpeed(kmh: number) {
    this.speed = Math.max(80, Math.min(340, kmh));
  }
  setPassRange(start:number,end:number){
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error('Invalid pass range');
    if(start===this.rangeStart&&end===this.rangeEnd)return;
    this.rangeStart=start;this.rangeEnd=end;this.replay();
  }
}
export class SimulationClock {
  last: number | null = null;
  reset() {
    this.last = null;
  }
  tick(now: number, visible = true) {
    if (!visible) {
      this.reset();
      return 0;
    }
    const dt = this.last === null ? 0 : Math.max(0, (now - this.last) / 1000);
    this.last = now;
    return dt;
  }
}
export const simulation = new VehicleSimulation();
