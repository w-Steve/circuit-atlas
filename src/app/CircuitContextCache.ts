import type {CircuitContextValue} from './CircuitContext';
import type {State} from '../store';
type Snapshot={memory:ReturnType<CircuitContextValue['store']['captureMemory']>;state:Partial<State>;simulation:Pick<CircuitContextValue['simulation'],'distance'|'elapsedSeconds'|'rangeStart'|'rangeEnd'|'speed'|'status'>;views:[string,{position:number[];target:number[];visit:number}][]};
/** Keep at most two CPU geometry models hot. Evicted circuits retain only small
 * session snapshots; GPU meshes/textures belong to the mounted Canvas. */
export class CircuitContextCache extends Map<string,CircuitContextValue>{
 private snapshots=new Map<string,Snapshot>();
 constructor(private capacity=2){super();if(!Number.isInteger(capacity)||capacity<1)throw Error('Invalid circuit cache capacity')}
 override get(id:string){const value=super.get(id);if(value){super.delete(id);super.set(id,value)}return value}
 override set(id:string,value:CircuitContextValue){
  const saved=this.snapshots.get(id);
  if(saved){value.store.setState(saved.state);value.store.restoreMemory(saved.memory);Object.assign(value.simulation,saved.simulation);for(const [key,view] of saved.views)value.views.set(key,view);this.snapshots.delete(id)}
  super.delete(id);super.set(id,value);
  while(this.size>this.capacity){const key=this.keys().next().value!,old=super.get(key)!;
   old.simulation.pause();
   const {distance,elapsedSeconds,rangeStart,rangeEnd,speed,status}=old.simulation;
   this.snapshots.set(key,{memory:old.store.captureMemory(),state:Object.fromEntries(Object.entries(old.store.getState()).filter(([,v])=>typeof v!=='function')),simulation:{distance,elapsedSeconds,rangeStart,rangeEnd,speed,status},views:[...old.views]});
   super.delete(key);
  }
  return this;
 }
}
