import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2, Vector3 } from "three";
import type { SpectatorZone } from "./types";
import type { createCircuitGeometry } from "./geometry";
type Definition = NonNullable<SpectatorZone['surfaces']>[number];
export interface SpectatorSurface {
  zone:SpectatorZone; definition:Definition; points:Vector2[]; center:Vector2;
  axis:Vector2; normal:Vector2; min:number; max:number; minN:number; maxN:number; frontSign:number;
}
export function createSpectators(zones:SpectatorZone[],geometry:ReturnType<typeof createCircuitGeometry>){
const spectatorZones=zones.filter(z=>z.availability==='available');
const {origin,calibration,at,length}=geometry;
const zoneById=(id:string)=>spectatorZones.find(z=>z.zoneId===id);
const trackSamples = Array.from({length:1800},(_,i)=>at(i/1800*length));
function nearestTrack(p: Vector3) {
  let best=0,d=Infinity;
  trackSamples.forEach((q,i)=>{const v=(q.x-p.x)**2+(q.z-p.z)**2;if(v<d){d=v;best=i}});
  // Refine only the local arc; do not approximate physical vehicle speed.
  let s=best/1800*length;
  for(const step of [1,.1,.01]){
    let chosen=s;
    for(let k=-4;k<=4;k++){
      const candidate=s+k*step,q=at(candidate),v=(q.x-p.x)**2+(q.z-p.z)**2;
      if(v<d){d=v;chosen=candidate}
    }
    s=chosen;
  }
  return {distance:((s%length)+length)%length, point:at(s)};
}
const geographic = ([lon,lat]:number[]) => new Vector2(
  (lon-origin[0])*111320*Math.cos(origin[1]*Math.PI/180)*calibration,
  -(lat-origin[1])*111320*calibration);
function prepare(zone:SpectatorZone,definition:Definition):SpectatorSurface {
  const points=definition.boundary.slice(0,-1).map(geographic);
  const center=points.reduce((p,q)=>p.add(q),new Vector2()).multiplyScalar(1/points.length);
  let xx=0,zz=0,xz=0;
  points.forEach(p=>{const x=p.x-center.x,z=p.y-center.y;xx+=x*x;zz+=z*z;xz+=x*z});
  const angle=.5*Math.atan2(2*xz,xx-zz),axis=new Vector2(Math.cos(angle),Math.sin(angle)),normal=new Vector2(-axis.y,axis.x);
  const along=points.map(p=>p.clone().sub(center).dot(axis)),across=points.map(p=>p.clone().sub(center).dot(normal));
  const reference=definition.frontReference?geographic(definition.frontReference):null;
  const track=reference?new Vector3(reference.x,0,reference.y):nearestTrack(new Vector3(center.x,0,center.y)).point;
  return {zone,definition,points,center,axis,normal,min:Math.min(...along),max:Math.max(...along),minN:Math.min(...across),maxN:Math.max(...across),frontSign:Math.sign(new Vector2(track.x-center.x,track.z-center.y).dot(normal))||1};
}
const zoneSurfaces = new Map(spectatorZones.map(z=>[z.zoneId,(z.surfaces??[]).map(s=>prepare(z,s))]));
function intervals(surface:SpectatorSurface,u:number) {
  const x=surface.min+(surface.max-surface.min)*Math.max(.00001,Math.min(.99999,u));
  const intersections:number[]=[];
  surface.points.forEach((a,i)=>{
    const b=surface.points[(i+1)%surface.points.length],aa=a.clone().sub(surface.center).dot(surface.axis),bb=b.clone().sub(surface.center).dot(surface.axis);
    if((aa<=x&&bb>x)||(bb<=x&&aa>x)){
      const p=a.clone().lerp(b,(x-aa)/(bb-aa)).sub(surface.center);intersections.push(p.dot(surface.normal));
    }
  });
  intersections.sort((a,b)=>a-b);
  const parts:{lo:number;hi:number}[]=[];
  for(let i=0;i+1<intersections.length;i+=2)if(intersections[i+1]-intersections[i]>1e-7)parts.push({lo:intersections[i],hi:intersections[i+1]});
  if(!parts.length)throw Error('No valid polygon section');
  return {x,parts,total:parts.reduce((sum,p)=>sum+p.hi-p.lo,0)};
}
function fractionAt(surface:SpectatorSurface,p:Vector2){
  const n=p.clone().sub(surface.center).dot(surface.normal);
  return Math.max(0,Math.min(1,(surface.frontSign>0?surface.maxN-n:n-surface.minN)/(surface.maxN-surface.minN)));
}
function floorHeight(surface:SpectatorSurface,p:Vector2){
  const {baseHeight,rise,rows}=surface.definition,ratio=fractionAt(surface,p);
  return baseHeight+(rows?Math.min(rows-1,Math.floor((ratio+1e-9)*rows))/(rows-1):ratio)*rise;
}
function surfacePoint(surface:SpectatorSurface,u:number,v:number,eye=false){
  const {x,parts,total}=intervals(surface,u);
  let remaining=Math.max(0,Math.min(1,surface.frontSign>0?1-v:v))*total;
  let n=parts[parts.length-1].hi;
  for(const part of parts){if(remaining<=part.hi-part.lo){n=part.lo+remaining;break}remaining-=part.hi-part.lo}
  const p=surface.center.clone().addScaledVector(surface.axis,x).addScaledVector(surface.normal,n);
  return new Vector3(p.x,floorHeight(surface,p)+(eye?surface.definition.eyeHeight:0),p.y);
}
function zonePoint(zoneId:string,u:number,v:number,eye=true){
  const surfaces=zoneSurfaces.get(zoneId);if(!surfaces?.length)throw Error('Unknown spectator zone');
  const total=surfaces.reduce((sum,s)=>sum+s.max-s.min,0);
  let distance=Math.max(0,Math.min(.999999,u))*total;
  for(const s of surfaces){const width=s.max-s.min;if(distance<=width)return surfacePoint(s,distance/width,v,eye);distance-=width}
  throw Error('Invalid zone parameter');
}
function selectionAt(surface:SpectatorSurface,point:Vector3){
  const p=new Vector2(point.x,point.z),along=p.clone().sub(surface.center).dot(surface.axis);
  const localU=Math.max(0,Math.min(1,(along-surface.min)/(surface.max-surface.min))), section=intervals(surface,localU);
  const n=p.clone().sub(surface.center).dot(surface.normal);
  let distance=0;
  for(const part of section.parts){distance+=Math.max(0,Math.min(part.hi-part.lo,n-part.lo))}
  const v=surface.frontSign>0?1-distance/section.total:distance/section.total;
  const all=zoneSurfaces.get(surface.zone.zoneId)!;
  let offset=0;for(const s of all){if(s===surface)break;offset+=s.max-s.min}
  const total=all.reduce((sum,s)=>sum+s.max-s.min,0);
  return {zoneId:surface.zone.zoneId,tier:'lower' as const,u:(offset+localU*(surface.max-surface.min))/total,v};
}
function clip(poly:Vector2[],value:(p:Vector2)=>number,bound:number,above:boolean){
  const result:Vector2[]=[];
  poly.forEach((a,i)=>{
    const b=poly[(i+1)%poly.length],av=value(a),bv=value(b),insideA=above?av>=bound:av<=bound,insideB=above?bv>=bound:bv<=bound;
    if(insideA)result.push(a);
    if(insideA!==insideB)result.push(a.clone().lerp(b,(bound-av)/(bv-av)));
  });
  return result;
}
function surfaceGeometry(surface:SpectatorSurface,baseAt?: (p:Vector2)=>number){
  const vertices:number[]=[];
  const emit=(a:Vector2,b:Vector2,c:Vector2,y:(p:Vector2)=>number)=>[a,b,c].forEach(p=>vertices.push(p.x,y(p),p.y));
  const {baseHeight,rise,rows}=surface.definition;
  for(const triangle of ShapeUtils.triangulateShape(surface.points,[])){
    const original=triangle.map(i=>surface.points[i]);
    if(!rows){emit(original[0],original[1],original[2],p=>floorHeight(surface,p));continue}
    for(let row=0;row<rows;row++){
      const poly=clip(clip(original,p=>fractionAt(surface,p),row/rows,true),p=>fractionAt(surface,p),(row+1)/rows,false);
      const y=baseHeight+row/(rows-1)*rise;
      for(let i=1;i+1<poly.length;i++)emit(poly[0],poly[i],poly[i+1],()=>y);
      if(row<rows-1)poly.forEach((a,i)=>{
        const b=poly[(i+1)%poly.length];
        if(Math.abs(fractionAt(surface,a)-(row+1)/rows)<1e-7&&Math.abs(fractionAt(surface,b)-(row+1)/rows)<1e-7){
          const high=y+rise/(rows-1);
          vertices.push(a.x,y,a.y,b.x,y,b.y,a.x,high,a.y,b.x,y,b.y,b.x,high,b.y,a.x,high,a.y);
        }
      });
    }
  }
  if(baseAt){
    // Close the seating platform down to its terrain datum. This adds support
    // faces only; it never moves the selected eye point or a single tread.
    surface.points.forEach((a,i)=>{
      const b=surface.points[(i+1)%surface.points.length];
      const ay=floorHeight(surface,a),by=floorHeight(surface,b),ag=Math.min(ay,baseAt(a)),bg=Math.min(by,baseAt(b));
      vertices.push(a.x,ag,a.y,b.x,bg,b.y,a.x,ay,a.y,b.x,bg,b.y,b.x,by,b.y,a.x,ay,a.y);
    });
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
function zonePassCenter(zoneId:string){return nearestTrack(facingTarget(zoneId,.5,.5)).distance}
function facingTarget(zoneId:string,u:number,v:number){
  const p=zonePoint(zoneId,u,v),surfaces=zoneSurfaces.get(zoneId)!;
  const surface=surfaces.reduce((best,s)=>{
    const selected=selectionAt(s,p),q=zonePoint(zoneId,selected.u,selected.v);
    return q.distanceTo(p)<best.distance?{surface:s,distance:q.distanceTo(p)}:best;
  },{surface:surfaces[0],distance:Infinity}).surface;
  if(!surface.definition.frontReference)return nearestTrack(p).point;
  const ref=geographic(surface.definition.frontReference);
  // Keep the chosen road branch even at the far end/back of the footprint.
  const arc=nearestTrack(new Vector3(ref.x,0,ref.y)).distance;
  let best=at(arc),distance=Infinity;
  for(let s=-150;s<=150;s+=2){
    const q=at(arc+s),dx=q.x-p.x,dz=q.z-p.z;
    if((dx*surface.normal.x+dz*surface.normal.y)*surface.frontSign<=0)continue;
    const d=dx*dx+dz*dz;if(d<distance){best=q;distance=d}
  }
  return best;
}

return {spectatorZones,zoneById,nearestTrack,zoneSurfaces,floorHeight,surfacePoint,zonePoint,selectionAt,surfaceGeometry,zonePassCenter,facingTarget};
}
export type SpectatorModel=ReturnType<typeof createSpectators>;
