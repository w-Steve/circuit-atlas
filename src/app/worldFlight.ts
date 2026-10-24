import {create} from 'zustand';
import {navigate} from './navigation';
import {loadCircuit} from '../circuits/registry';

export interface WorldFlight {
 id:number;href:string;circuitId:string;name:string;coordinate:readonly number[];
 origin:{x:number;y:number};keyboard:boolean;
}
export const useWorldFlight=create<{flight:WorldFlight|null;clear:()=>void}>(set=>({flight:null,clear:()=>set({flight:null})}));
let sequence=0;
export function startWorldFlight(flight:Omit<WorldFlight,'id'>){
 if(useWorldFlight.getState().flight)return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){navigate(flight.href);return;}
 // Warm only this circuit's data; other models remain lazy-loaded.
 void loadCircuit(flight.circuitId).catch(()=>{});
 useWorldFlight.setState({flight:{...flight,id:++sequence}});
}
export const formatCoordinate=(value:number,positive:string,negative:string)=>`${Math.abs(value).toFixed(4)}° ${value<0?negative:positive}`;
