import type { Selection } from "../store";
import { observer } from "./GrandstandGeometry";
import { nearestTrack } from "../circuits/shanghai/spectators";
import type {VehicleSimulation} from "./VehicleSimulation";
// A deliberate new pass starts upstream of this observer. Paused/running passes
// remain at their exact physical position when the observer or camera changes.
export function prepareLocalPass(selection:Selection,simulation:VehicleSimulation){
  if(simulation.status!=='ready')return;
  if(!selection.zoneId||selection.zoneId==='a')return;
  const center=nearestTrack(observer(selection)).distance;
  simulation.setPassRange(center-350,center+450);
}
