import {resolveTiming} from '../circuits/timingGeometry';
import {createContext,useContext} from 'react';
import {Box3,Vector3,type Group,type Object3D,type PerspectiveCamera} from 'three';
import type {OrbitControls} from 'three-stdlib';
import {createAppStore,type Selection} from '../store';
import {createCircuitGeometry} from '../circuits/geometry';
import {createSpectators} from '../circuits/spectators';
import {terrainSpectatorZones} from '../circuits/spectatorDatum';
import type {CircuitPackage} from '../circuits/types';
import {VehicleSimulation,cockpitAt,placeVehicle} from '../systems/VehicleDynamics';
import {roadClearance} from '../circuits/fenceGeometry';
import {circuitBarriers} from '../circuits/barrierGeometry';
import type {PhotoResult} from '../camera/TemporalCapture';

/** One owner per mounted circuit; no mutable process-wide active circuit. */
export function createCircuitContext(data:CircuitPackage){
 const barrierIds=new Set(circuitBarriers(data).map(b=>b.id));
 if(data.spectatorZones.some(z=>z.availability==='available'&&z.requiredBarrierIds?.some(id=>!barrierIds.has(id))))throw Error('Required spectator barrier geometry unavailable');
 const geometry=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
 const timing=(()=>{try{return data.timing?resolveTiming(data,geometry,data.timing):null}catch{return null}})();
 const spectators=createSpectators(terrainSpectatorZones(data),geometry);
 const defaultSelection=(circuitId:string,zoneId:string)=>{
  if(circuitId!==data.circuitId)return undefined;
  const entry=spectators.zoneById(zoneId)?.defaultViewpoint;
  const surface=entry&&spectators.zoneSurfaces.get(zoneId)?.find(s=>s.definition.surfaceId===entry.surfaceId);
  if(!entry||!surface||!entry.coordinate.every(Number.isFinite))return undefined;
  const [lon,lat]=entry.coordinate,p=new Vector3((lon-geometry.origin[0])*111320*Math.cos(geometry.origin[1]*Math.PI/180)*geometry.calibration,0,-(lat-geometry.origin[1])*111320*geometry.calibration);
  try{
   const pick=spectators.selectionAt(surface,p);
   if(![pick.u,pick.v].every(n=>Number.isFinite(n)&&n>=-1e-6&&n<=1+1e-6))return undefined;
   return {...pick,u:Math.max(0,Math.min(1,pick.u)),v:Math.max(0,Math.min(1,pick.v))};
  }catch{return undefined} // A malformed optional entry cannot disable a valid circuit.
 };
 const store=createAppStore(data.circuitId,spectators.spectatorZones[0]?.zoneId,defaultSelection);
 const simulation=new VehicleSimulation();
 const selected=store.getState().selection.zoneId;
 const center=selected?spectators.zonePassCenter(selected):0;
 const initialRange=data.spectatorZones.find(z=>z.zoneId===selected)?.passRangeMetres;
 simulation.setPassRange(...(initialRange??[center-350,center+450] as [number,number]));
 const bounds=new Box3().setFromPoints(geometry.geoPoints),mapCenter=bounds.getCenter(new Vector3());
 const region=(s:Selection)=>data.scene?.regions?.find(r=>r.zoneId===s.zoneId&&r.tier===s.tier);
 const selectedSurface=(s:Selection)=>{const r=region(s);return r?spectators.zoneSurfaces.get(s.zoneId!)?.find(p=>p.definition.surfaceId===r.surfaceId):undefined};
 let clearance:ReturnType<typeof roadClearance>|undefined;
 const observerFloor=(s:Selection)=>{
  const r=region(s),surface=selectedSurface(s);
  return r&&surface?spectators.surfacePoint(surface,r.uRange[0]+s.u*(r.uRange[1]-r.uRange[0]),r.vRange[0]+s.v*(r.vRange[1]-r.vRange[0]),false):spectators.zonePoint(s.zoneId!,s.u,s.v,false);
 };
 const observer=(s:Selection)=>{
  const r=region(s),surface=selectedSurface(s);
  return r&&surface?spectators.surfacePoint(surface,r.uRange[0]+s.u*(r.uRange[1]-r.uRange[0]),r.vRange[0]+s.v*(r.vRange[1]-r.vRange[0]),true):spectators.zonePoint(s.zoneId!,s.u,s.v);
 };
 const lookTarget=(s:Selection)=>{
  const r=region(s),surface=selectedSurface(s),all=spectators.zoneSurfaces.get(s.zoneId!)!;
  const frame=surface?.definition.viewTargetFrame;
  if(frame&&r){const u=r.uRange[0]+s.u*(r.uRange[1]-r.uRange[0]);return new Vector3(...frame.origin).add(new Vector3(frame.along[0],0,frame.along[1]).multiplyScalar((u-.5)*frame.length))}
  let u=s.u;
  if(r&&surface){let offset=0;for(const p of all){if(p===surface)break;offset+=p.max-p.min}
   const total=all.reduce((sum,p)=>sum+p.max-p.min,0);
   u=(offset+(r.uRange[0]+s.u*(r.uRange[1]-r.uRange[0]))*(surface.max-surface.min))/total;
  }
  return spectators.facingTarget(s.zoneId!,u,s.v).add(new Vector3(0,.9,0));
 };
 return {clearance:()=>clearance??=roadClearance(data,geometry),data,geometry,timing,spectators,store,simulation,bounds,mapCenter,observer,observerFloor,lookTarget,selectedSurface,
  selectAt:(surface:import('../circuits/spectators').SpectatorSurface,point:Vector3)=>{
   const pick=spectators.selectionAt(surface,point);
   // Legacy banks use a global u across all surfaces. Only authored regions
   // consume local tier coordinates; normalizing other banks moves the eye.
   if(!surface.definition.tier||!data.scene?.regions?.some(r=>r.zoneId===pick.zoneId&&r.surfaceId===surface.definition.surfaceId))return pick;
   const all=spectators.zoneSurfaces.get(pick.zoneId)!,total=all.reduce((sum,p)=>sum+p.max-p.min,0);
   let offset=0;for(const p of all){if(p===surface)break;offset+=p.max-p.min}
   const u=(pick.u*total-offset)/(surface.max-surface.min),active=store.getState().selection;
   const r=region(active);
   return r&&active.tier==='platinum'&&r.surfaceId===surface.definition.surfaceId?{...pick,tier:active.tier,u:(u-r.uRange[0])/(r.uRange[1]-r.uRange[0]),v:(pick.v-r.vRange[0])/(r.vRange[1]-r.vRange[0])}:{...pick,tier:surface.definition.tier,u};
  },
  camera:{current:null as PerspectiveCamera|null},controls:{current:null as OrbitControls|null},vehicle:{current:null as Group|null},
  shutter:{busy:false,capture:null as null|(()=>Promise<PhotoResult>)},
  views:new Map<string,{position:number[];target:number[];visit:number}>(),
  cockpitAt:(distance:number)=>cockpitAt(distance,geometry),
  placeVehicle:(vehicle:Object3D,distance:number)=>placeVehicle(vehicle,distance,geometry),
  preparePass:(s:Selection)=>{if(simulation.status==='ready'){const range=data.spectatorZones.find(z=>z.zoneId===s.zoneId)?.passRangeMetres;if(range){simulation.setPassRange(...range);return}const c=spectators.nearestTrack(lookTarget(s)).distance;simulation.setPassRange(c-350,c+450)}},
 };
}
export type CircuitContextValue=ReturnType<typeof createCircuitContext>;
export const CircuitContext=createContext<CircuitContextValue|null>(null);
export function useCircuit(){const value=useContext(CircuitContext);if(!value)throw Error('Circuit context is missing');return value}
export function useCircuitStore(){return useCircuit().store}
