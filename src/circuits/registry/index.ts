import summaries from "../generated/summaries.json";
import type { CircuitPackage, CircuitSummary, CircuitFacilities, CircuitWater,CircuitTiming } from "../types";
export const circuitRegistry = summaries as readonly CircuitSummary[];
const loaders = import.meta.glob<{ default: CircuitPackage }>(["../generated/*.json", "!../generated/summaries.json", "!../generated/outlines.json"]);
const facilityLoaders=import.meta.glob<{default:CircuitFacilities}>('../facilities/*.json');
const waterLoaders=import.meta.glob<{default:CircuitWater}>('../water/*.json');
const timingLoaders=import.meta.glob<{default:CircuitTiming}>('../timing/*.json');
export async function loadCircuit(circuitId: string) {
  const loader = circuitRegistry.some(c => c.circuitId === circuitId)
    ? loaders[`../generated/${circuitId}.json`] : undefined;
  if (!loader) throw new Error(`Unknown circuit: ${circuitId}`);
  let data = (await loader()).default;
  if (data.circuitId !== circuitId || !data.trackGeometry.coordinates.length)
    throw new Error("Invalid circuit data package");
  const timing=timingLoaders[`../timing/${circuitId}.json`];
  if(timing){try{data={...data,timing:(await timing()).default}}catch{/* Optional annotations cannot disable the circuit. */}}
  const water=waterLoaders[`../water/${circuitId}.json`];
  if(water){try{data={...data,water:(await water()).default}}catch{/* Optional map layer cannot disable the simulation. */}}
  const facilities=facilityLoaders[`../facilities/${circuitId}.json`];
  if(!facilities)return data;
  let details:CircuitFacilities;
  try{details=(await facilities()).default}catch{
    return {...data,facilities:{circuitId,buildings:[],pitLanes:[],notes:'维修区资源未能载入，赛道与观赛仍可使用。刷新可重试。'}};
  }
  const building=details.buildings[0],boundary=building?.boundary.slice(0,-1);
  const coordinate=boundary?.length?boundary.reduce((p,q)=>[p[0]+q[0]/boundary.length,p[1]+q[1]/boundary.length],[0,0]) as [number,number]:null;
  return {...data,facilities:details,pitLocation:coordinate?{coordinate,source:building.source}:data.pitLocation};
}
