import {simulation} from '../systems/VehicleSimulation';
const saved=new Map<string,{distance:number;elapsedSeconds:number;rangeStart:number;rangeEnd:number;speed:number;status:typeof simulation.status}>();
export function saveSimulation(id:string){
  const {distance,elapsedSeconds,rangeStart,rangeEnd,speed,status}=simulation;
  saved.set(id,{distance,elapsedSeconds,rangeStart,rangeEnd,speed,status:status==='running'?'paused':status});
  simulation.pause();
}
export function restoreSimulation(id:string,start:number,end:number){
  const previous=saved.get(id);
  if(previous)Object.assign(simulation,previous);
  else {simulation.setPassRange(start,end);simulation.replay()}
}
