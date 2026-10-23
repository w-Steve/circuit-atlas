import {circuitRuntime} from "../circuits/runtime";
import type { Selection } from "../store";
import { observer } from "./GrandstandGeometry";
import { nearestTrack } from "../circuits/shanghai/spectators";
import { simulation } from "./VehicleSimulation";
// A deliberate new pass starts upstream of this observer. Paused/running passes
// remain at their exact physical position when the observer or camera changes.
export function prepareLocalPass(selection:Selection){
  if(simulation.status!=='ready')return;
  if(circuitRuntime.current){const model=circuitRuntime.current.spectators;const center=model.nearestTrack(model.facingTarget(selection.zoneId!,selection.u,selection.v)).distance;simulation.setPassRange(center-350,center+450);return}
  if(!selection.zoneId||selection.zoneId==='a')return;
  const center=nearestTrack(observer(selection)).distance;
  simulation.setPassRange(center-350,center+450);
}
