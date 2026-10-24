import {Vector3} from 'three';
import type {SpectatorSurface,SpectatorModel} from './spectators';
import type {CircuitPackage} from './types';
import type {createCircuitGeometry} from './geometry';
import {geographicPoint} from './facilityGeometry';
import {terrainHeight} from './elevation';

type Geometry=ReturnType<typeof createCircuitGeometry>;
type Segment={a:Vector3;b:Vector3;width:number};
export function roadClearance(data:CircuitPackage,g:Geometry){
 const cell=30,buckets=new Map<string,Segment[]>();
 const add=(a:Vector3,b:Vector3,width:number)=>{
  const margin=width/2+8;
  for(let x=Math.floor((Math.min(a.x,b.x)-margin)/cell);x<=Math.floor((Math.max(a.x,b.x)+margin)/cell);x++)
   for(let z=Math.floor((Math.min(a.z,b.z)-margin)/cell);z<=Math.floor((Math.max(a.z,b.z)+margin)/cell);z++){
    const key=`${x},${z}`,list=buckets.get(key)??[];list.push({a,b,width});buckets.set(key,list);
   }
 };
 const count=Math.ceil(g.length/2);
 for(let i=0;i<count;i++)add(g.at(i/count*g.length),g.at((i+1)/count*g.length),data.trackGeometry.widthMetres);
 for(const lane of data.facilities?.pitLanes??[]){if(lane.underground)continue;
  const p=lane.coordinates.map(c=>geographicPoint(g,c));p.slice(0,-1).forEach((a,i)=>add(a,p[i+1],lane.widthMetres));
 }
 return (p:Vector3)=>{
  let clearance=Infinity;
  for(const {a,b,width} of buckets.get(`${Math.floor(p.x/cell)},${Math.floor(p.z/cell)}`)??[]){
   const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
   clearance=Math.min(clearance,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)-width/2);
  }
  return clearance;
 };
}
/** Estimated front barrier, not a surveyed fence. Never extrude it into a road.
 * Keep a continuous path only where the source front edge has enough clearance.
 * A conflicting source footprint is an audit issue, never a reason to move eyes.
 */
export function spectatorFence(surface:SpectatorSurface,model:Pick<SpectatorModel,'surfacePoint'>,data:CircuitPackage,g:Geometry,clearance:ReturnType<typeof roadClearance>){
 // An upper deck is not another trackside catch fence.
 if(surface.definition.baseReference)return [];
 if(surface.definition.terrainFollow){
  const segments:[Vector3,Vector3][]=[];
  // Only the actual near-road boundary receives an estimated catch fence.
  // Ignore internal partition edges and walking routes across the public bank.
  surface.points.forEach((p,i)=>{
   const q=surface.points[(i+1)%surface.points.length],steps=Math.max(1,Math.ceil(p.distanceTo(q)/2));
   for(let j=0;j<steps;j++){
    const a=new Vector3(p.x,0,p.y).lerp(new Vector3(q.x,0,q.y),j/steps),b=new Vector3(p.x,0,p.y).lerp(new Vector3(q.x,0,q.y),(j+1)/steps);
    const ca=clearance(a),cb=clearance(b),cm=clearance(a.clone().lerp(b,.5));
    if(Math.min(ca,cb,cm)<.7||Math.max(ca,cb,cm)>6||Math.abs(ca-cb)>a.distanceTo(b)*.18)continue;
    for(const point of [a,b])point.y=g.groundAt(point.x,point.z)+.1;
    segments.push([a,b]);
   }
  });return segments;
 }
 const count=Math.max(24,Math.ceil((surface.max-surface.min)/2)),points:(Vector3|null)[]=[];
 for(let i=0;i<=count;i++){
  const p=model.surfacePoint(surface,i/count,0),back=model.surfacePoint(surface,i/count,1),toward=p.clone().sub(back).setY(0).normalize();
  if(clearance(p)<.75){points.push(null);continue}
  let offset=0;
  for(let step=.25;step<=4;step+=.25){if(clearance(p.clone().addScaledVector(toward,step))<.75)break;offset=step}
  p.addScaledVector(toward,offset);
  const lon=g.origin[0]+p.x/(111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration),lat=g.origin[1]-p.z/(111320*g.calibration);
  p.y=terrainHeight(data.elevation,lon,lat)+.1;points.push(p);
 }
 const segments:[Vector3,Vector3][]=[];
 points.slice(0,-1).forEach((a,i)=>{const b=points[i+1];if(!a||!b)return;
  // Curved front edges can form chords across a road: verify the whole segment.
  const n=Math.max(2,Math.ceil(a.distanceTo(b)/.25));
  for(let j=0;j<=n;j++)if(clearance(a.clone().lerp(b,j/n))<.7)return;
  segments.push([a,b]);
 });
 return segments;
}
