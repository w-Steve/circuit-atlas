import type {CircuitPackage,SpectatorZone} from './types';
import {terrainHeight} from './elevation';

/** Resolve ground and structural datums once, identically for render, eyes and audits. */
export function terrainSpectatorZones(data:CircuitPackage):SpectatorZone[]{
 const zones=data.spectatorZones.filter(z=>z.availability==='available').map(z=>({...z,surfaces:z.surfaces?.map(s=>{
  if(s.terrainRiseReference&&(s.terrainFollow||s.absoluteBase||s.baseReference))throw Error(`Conflicting earth bank reference ${z.zoneId}:${s.surfaceId}`);
  if(s.terrainFollow||s.absoluteBase)return {...s};
  const center=s.boundary.reduce((p,q)=>[p[0]+q[0]/s.boundary.length,p[1]+q[1]/s.boundary.length],[0,0]);
  const ground=s.groundReference?.coordinate??center;
  if(!ground.every(Number.isFinite))throw Error(`Invalid spectator ground reference ${z.zoneId}:${s.surfaceId}`);
  const front=terrainHeight(data.elevation,ground[0],ground[1]);
  if(s.terrainRiseReference){
   const rear=s.terrainRiseReference.coordinate;
   if(!s.groundReference||s.baseReference||!rear.every(Number.isFinite))throw Error(`Invalid earth bank reference ${z.zoneId}:${s.surfaceId}`);
   const rise=terrainHeight(data.elevation,...rear)-front;
   if(!Number.isFinite(rise)||rise<0||s.rows<2)throw Error(`Invalid earth bank grade ${z.zoneId}:${s.surfaceId}`);
   return {...s,baseHeight:s.baseHeight+front,rise,rowRiserMetres:rise/(s.rows-1)};
  }
  return {...s,baseHeight:s.baseHeight+front};
 })}));
 type Surface=NonNullable<SpectatorZone['surfaces']>[number];
 const surfaces=new Map<string,Surface>();
 zones.forEach(z=>z.surfaces?.forEach(s=>surfaces.set(`${z.zoneId}:${s.surfaceId}`,s)));
 const resolved=new Set<string>(),resolving=new Set<string>();
 const resolve=(key:string):Surface=>{
  const s=surfaces.get(key);if(!s)throw Error(`Missing spectator datum ${key}`);
  if(resolved.has(key))return s;
  if(resolving.has(key))throw Error(`Cyclic spectator datum ${key}`);
  resolving.add(key);
  if(s.baseReference){
   const ref=s.baseReference,parent=resolve(`${ref.zoneId}:${ref.surfaceId}`);
   if(!Number.isFinite(ref.offsetMetres))throw Error(`Invalid spectator datum ${key}`);
   s.baseHeight=parent.baseHeight+parent.rise+ref.offsetMetres;
  }
  resolving.delete(key);resolved.add(key);return s;
 };
 surfaces.forEach((_,key)=>resolve(key));
 return zones;
}
