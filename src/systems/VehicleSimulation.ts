import {at,tangent,length} from './CircuitGeometry';
import {VehicleSimulation as Base,placeVehicle as place,cockpitAt as cockpit,type VehiclePath} from './VehicleDynamics';
export {SimulationClock} from './VehicleDynamics';
export const passStart=length-620,passEnd=length+100;
export class VehicleSimulation extends Base{constructor(){super();this.setPassRange(passStart,passEnd)}}
export const placeVehicle=(vehicle:import('three').Object3D,distance:number,path:VehiclePath={at,tangent})=>place(vehicle,distance,path);
export const cockpitAt=(distance:number,path:VehiclePath={at,tangent})=>cockpit(distance,path);
