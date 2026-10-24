import type {AppRoute} from './navigation';

const visits=new Map<string,number>();
export const circuitVisit=(id:string)=>visits.get(id)??0;
/** A fresh entry from the world catalogue resets only the destination's map.
 * Eye/phone -> map and the world map itself keep their own remembered views. */
export function noteCircuitEntry(previous:AppRoute,next:AppRoute){
 if(previous.level==='catalog'&&next.level==='circuit')visits.set(next.circuitId,circuitVisit(next.circuitId)+1);
}
