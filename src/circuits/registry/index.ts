import summaries from "../generated/summaries.json";
import type { CircuitPackage, CircuitSummary, CircuitFacilities, CircuitWater,CircuitTiming,CircuitBarrierPackage } from "../types";
export const circuitRegistry = summaries as readonly CircuitSummary[];
const loaders = import.meta.glob<{ default: CircuitPackage }>(["../generated/*.json", "!../generated/summaries.json", "!../generated/outlines.json"]);
const facilityLoaders=import.meta.glob<{default:CircuitFacilities}>('../facilities/*.json');
const waterLoaders=import.meta.glob<{default:CircuitWater}>('../water/*.json');
const timingLoaders=import.meta.glob<{default:CircuitTiming}>('../timing/*.json');
const barrierLoaders=import.meta.glob<{default:CircuitBarrierPackage}>('../barriers/*.json');
const sceneLoaders=import.meta.glob<{default:Pick<CircuitPackage,'scene'|'spectatorZones'>}>('../scenes/*.json');
export async function loadCircuit(circuitId: string) {
  const loader = circuitRegistry.some(c => c.circuitId === circuitId)
    ? loaders[`../generated/${circuitId}.json`] : undefined;
  if (!loader) throw new Error(`Unknown circuit: ${circuitId}`);
  let data = (await loader()).default;
  if (data.circuitId !== circuitId || !data.trackGeometry.coordinates.length)
    throw new Error("Invalid circuit data package");
  const scene=sceneLoaders[`../scenes/${circuitId}.json`];
  if(scene){const authored=(await scene()).default;data={...data,scene:authored.scene,spectatorZones:data.spectatorZones.map(z=>authored.spectatorZones.find(a=>a.zoneId===z.zoneId)??z)}}
  const timing=timingLoaders[`../timing/${circuitId}.json`];
  if(timing){try{data={...data,timing:(await timing()).default}}catch{/* Optional annotations cannot disable the circuit. */}}
  const water=waterLoaders[`../water/${circuitId}.json`];
  if(water){try{data={...data,water:(await water()).default}}catch{/* Optional map layer cannot disable the simulation. */}}
  const barrierKeys=Object.keys(barrierLoaders).filter(key=>key===`../barriers/${circuitId}.json`||key.startsWith(`../barriers/${circuitId}-`));
  if(barrierKeys.length){
    const layers=await Promise.all(barrierKeys.map(async key=>(await barrierLoaders[key]()).default));
    if(layers.some(layer=>layer.circuitId!==circuitId||!Array.isArray(layer.barriers)))throw Error('Invalid circuit barrier layer');
    const barriers=layers.filter(layer=>layer.availability===undefined||layer.availability==='available').flatMap(layer=>layer.barriers);
    if(new Set(barriers.map(b=>b.id)).size!==barriers.length)throw Error('Duplicate circuit barrier identity');
    data={...data,barriers:{circuitId,availability:'available',barriers,notes:layers.map(layer=>layer.notes).join('\n')}};
  }
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
