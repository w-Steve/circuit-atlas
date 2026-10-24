import type {CircuitPackage} from './types';
import type {createCircuitGeometry} from './geometry';
import {geographicPoint} from './facilityGeometry';
import {terrainSpectatorZones} from './spectatorDatum';

/** Display-only foundation cut beneath estimated seating footprints.
 * SRTM cannot resolve stand foundations. Preserve the source DEM and eye points,
 * while preventing coarse terrain triangles from crossing the seating platform.
 */
export type TerrainFoundation={ring:{x:number;z:number}[];base:number};
export function spectatorTerrain(data:CircuitPackage,g:ReturnType<typeof createCircuitGeometry>,meshCell:number,additional:readonly TerrainFoundation[]=[]){
 type Foundation={ring:{x:number;z:number}[];base:number};
 const buckets=new Map<string,Foundation[]>(),cell=40,inner=meshCell*1.5,outer=inner+meshCell;
 const add=(f:Foundation)=>{
  const {ring}=f;
  const x0=Math.floor((Math.min(...ring.map(p=>p.x))-outer)/cell),x1=Math.floor((Math.max(...ring.map(p=>p.x))+outer)/cell);
  const z0=Math.floor((Math.min(...ring.map(p=>p.z))-outer)/cell),z1=Math.floor((Math.max(...ring.map(p=>p.z))+outer)/cell);
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=`${x},${z}`,list=buckets.get(key)??[];list.push(f);buckets.set(key,list)}
 };
 for(const zone of terrainSpectatorZones(data))for(const s of zone.surfaces??[]){
  if(s.terrainFollow)continue;
  const ring=s.boundary.slice(0,-1).map(p=>geographicPoint(g,p,0));
  const f:Foundation={ring,base:s.baseHeight};
  add(f);
 }
 additional.forEach(add);
 return (x:number,z:number,raw:number)=>{
  let height=raw;
  for(const f of buckets.get(`${Math.floor(x/cell)},${Math.floor(z/cell)}`)??[]){
   let inside=false,distance=Infinity;
   f.ring.forEach((a,i)=>{
    const b=f.ring[(i+1)%f.ring.length];
    if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
    const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    distance=Math.min(distance,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
   });
   if(inside)distance=0;if(distance>=outer)continue;
   const t=Math.max(0,(distance-inner)/(outer-inner)),blend=t*t*(3-2*t);
   height=Math.min(height,f.base+(raw-f.base)*blend);
  }
  return height;
 };
}
