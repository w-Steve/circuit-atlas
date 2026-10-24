import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2, Vector3 } from "three";
import type { SpectatorZone } from "./types";
import type { createCircuitGeometry } from "./geometry";
type Definition = NonNullable<SpectatorZone['surfaces']>[number];
export interface SpectatorSurface {
  zone:SpectatorZone; definition:Definition; points:Vector2[]; center:Vector2;
  axis:Vector2; normal:Vector2; min:number; max:number; minN:number; maxN:number; frontSign:number;
}
export function createSpectators(zones:SpectatorZone[],geometry:Pick<ReturnType<typeof createCircuitGeometry>,'origin'|'calibration'|'at'|'length'>&{groundAt?:(x:number,z:number)=>number}){
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
  if(definition.terrainFollow&&(definition.rows!==0||zone.kind==='grandstand'||!geometry.groundAt))throw Error('Terrain-following public ground requires unseated geometry and a source ground sampler');
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
const grassCache=new WeakMap<SpectatorSurface,Vector3[][]>();
const grassBuckets=new WeakMap<SpectatorSurface,Map<string,Vector3[][]>>();
function groundTrianglesAt(surface:SpectatorSurface,p:Vector2){
 const triangles=grassTriangles(surface);
 if(!surface.definition.terrainFollow)return triangles;
 let buckets=grassBuckets.get(surface);
 if(!buckets){
  buckets=new Map();
  for(const triangle of triangles){
   const xs=triangle.map(p=>p.x),zs=triangle.map(p=>p.z);
   for(let x=Math.floor(Math.min(...xs)/24);x<=Math.floor(Math.max(...xs)/24);x++)for(let z=Math.floor(Math.min(...zs)/24);z<=Math.floor(Math.max(...zs)/24);z++){
    const key=`${x},${z}`,list=buckets.get(key)??[];list.push(triangle);buckets.set(key,list);
   }
  }
  grassBuckets.set(surface,buckets);
 }
 return buckets.get(`${Math.floor(p.x/24)},${Math.floor(p.y/24)}`)??[];
}
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
function rowDistance(surface:SpectatorSurface,p:Vector2){
  const relative=p.clone().sub(surface.center),u=(relative.dot(surface.axis)-surface.min)/(surface.max-surface.min);
  const section=intervals(surface,u),n=relative.dot(surface.normal);
  const fromMin=section.parts.reduce((sum,part)=>sum+Math.max(0,Math.min(part.hi-part.lo,n-part.lo)),0);
  return {distance:surface.frontSign>0?section.total-fromMin:fromMin,depth:section.total};
}
function fractionAt(surface:SpectatorSurface,p:Vector2){const r=rowDistance(surface,p);return Math.max(0,Math.min(1,r.distance/r.depth))}
function floorHeight(surface:SpectatorSurface,p:Vector2){
  const {baseHeight,rise,rows}=surface.definition,ratio=fractionAt(surface,p);
  if(!rows){
    for(const [a,b,c] of groundTrianglesAt(surface,p)){
      const denominator=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(denominator)<1e-10)continue;
      const u=((b.z-c.z)*(p.x-c.x)+(c.x-b.x)*(p.y-c.z))/denominator;
      const v=((c.z-a.z)*(p.x-c.x)+(a.x-c.x)*(p.y-c.z))/denominator;
      if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7)return u*a.y+v*b.y+(1-u-v)*c.y;
    }
    if(surface.definition.terrainFollow)throw Error('Viewpoint lies outside the public-ground mesh');
  }
  return baseHeight+(rows>1?Math.min(rows-1,Math.floor((ratio+1e-9)*rows))/(rows-1):rows===1?0:ratio)*rise;
}
function surfacePoint(surface:SpectatorSurface,u:number,v:number,eye=false){
  const {x,parts,total}=intervals(surface,u);
  // A mathematical tread edge is ambiguous once uploaded to a Float32 mesh.
  // Place exact-boundary picks 2 mm inside the selected tread, never below it.
  const rows=surface.definition.rows;
  const pickedV=rows>1&&v>0&&v<1&&Math.abs(v*rows-Math.round(v*rows))<1e-8?Math.min(1,v+.002/total):v;
  let remaining=Math.max(0,Math.min(1,surface.frontSign>0?1-pickedV:pickedV))*total;
  let n=parts[parts.length-1].hi;
  for(const part of parts){if(remaining<=part.hi-part.lo){n=part.lo+remaining;break}remaining-=part.hi-part.lo}
  const p=surface.center.clone().addScaledVector(surface.axis,x).addScaledVector(surface.normal,n);
  return new Vector3(p.x,floorHeight(surface,p)+(eye?surface.definition.eyeHeight:0),p.y);
}
function surfaceAt(zoneId:string,u:number){
  const surfaces=zoneSurfaces.get(zoneId);if(!surfaces?.length)throw Error('Unknown spectator zone');
  const total=surfaces.reduce((sum,s)=>sum+s.max-s.min,0);
  let distance=Math.max(0,Math.min(.999999,u))*total;
  for(const surface of surfaces){const width=surface.max-surface.min;if(distance<=width)return {surface,localU:distance/width};distance-=width}
  throw Error('Invalid zone parameter');
}
function zonePoint(zoneId:string,u:number,v:number,eye=true){
  const {surface,localU}=surfaceAt(zoneId,u);
  return surfacePoint(surface,localU,v,eye);
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
function grassTriangles(surface:SpectatorSurface){
  const cached=grassCache.get(surface);if(cached)return cached;
  const result:Vector3[][]=[],along=(p:Vector2)=>p.clone().sub(surface.center).dot(surface.axis);
  const cuts=[...new Set(surface.points.map(p=>Math.round(along(p)*1e7)/1e7))].sort((a,b)=>a-b);
  for(const t of ShapeUtils.triangulateShape(surface.points,[]))for(let i=0;i<cuts.length-1;i++){
    const poly=clip(clip(t.map(index=>surface.points[index]),along,cuts[i],true),along,cuts[i+1],false);
    for(let j=1;j+1<poly.length;j++)result.push([poly[0],poly[j],poly[j+1]].map(p=>new Vector3(p.x,surface.definition.baseHeight+fractionAt(surface,p)*surface.definition.rise,p.y)));
  }
  if(surface.definition.terrainFollow){
   if(!geometry.groundAt)throw Error('Terrain-following ground requires a source elevation sampler');
   const subdivided:Vector3[][]=[];
   const split=(triangle:Vector3[])=>{
    const lengths=triangle.map((p,i)=>p.clone().setY(0).distanceToSquared(triangle[(i+1)%3].clone().setY(0)));
    const edge=lengths.indexOf(Math.max(...lengths));
    if(lengths[edge]>64){const a=triangle[edge],b=triangle[(edge+1)%3],c=triangle[(edge+2)%3],mid=a.clone().lerp(b,.5);split([a,mid,c]);split([mid,b,c]);return}
    subdivided.push(triangle.map(p=>new Vector3(p.x,geometry.groundAt!(p.x,p.z)+surface.definition.baseHeight,p.z)));
   };
   result.forEach(split);grassCache.set(surface,subdivided);return subdivided;
  }
  grassCache.set(surface,result);return result;
}
function surfaceGeometry(surface:SpectatorSurface,baseAt?: (p:Vector2)=>number){
  const vertices:number[]=[];
  const emit=(a:Vector2,b:Vector2,c:Vector2,y:(p:Vector2)=>number)=>[a,b,c].forEach(p=>vertices.push(p.x,y(p),p.y));
  const {baseHeight,rise,rows}=surface.definition;
  const along=(p:Vector2)=>(p.x-surface.center.x)*surface.axis.x+(p.y-surface.center.y)*surface.axis.y;
  // Split at footprint vertices: between these cuts each front/back boundary is
  // linear. A row follows that local section instead of a single global slope.
  const cuts=[...new Set(surface.points.map(p=>Math.round(along(p)*1e7)/1e7))].sort((a,b)=>a-b);
  if(!rows)for(const triangle of grassTriangles(surface))for(const p of triangle)vertices.push(p.x,p.y,p.z);
  if(rows)for(let slice=0;slice<cuts.length-1;slice++){
    const left=cuts[slice],right=cuts[slice+1];if(right-left<1e-8)continue;
    const a=left+(right-left)*.25,b=left+(right-left)*.75;
    const first=intervals(surface,(a-surface.min)/(surface.max-surface.min)).parts;
    const second=intervals(surface,(b-surface.min)/(surface.max-surface.min)).parts;
    const section=(x:number)=>first.map((part,j)=>{
      const last=second[j]??part,r=(x-a)/(b-a);
      return {lo:part.lo+(last.lo-part.lo)*r,hi:part.hi+(last.hi-part.hi)*r};
    });
    const point=(x:number,n:number)=>surface.center.clone().addScaledVector(surface.axis,x).addScaledVector(surface.normal,n);
    for(let part=0;part<first.length;part++){
      const l=section(left)[part],r=section(right)[part];
      const cell=[point(left,l.lo),point(right,r.lo),point(right,r.hi),point(left,l.hi)];
      // This field is affine within one polygon interval. Clamping across gaps
      // made clipping nonlinear and created long triangular spikes at row ends.
      const field=(p:Vector2,ratio:number)=>{
        const parts=section(along(p)),total=parts.reduce((v,q)=>v+q.hi-q.lo,0);
        const before=parts.slice(0,part).reduce((v,q)=>v+q.hi-q.lo,0);
        const n=p.clone().sub(surface.center).dot(surface.normal);
        const distance=before+n-parts[part].lo;
        return (surface.frontSign>0?total-distance:distance)-ratio*total;
      };
      for(let row=0;row<rows;row++){
        const poly=clip(clip(cell,p=>field(p,row/rows),0,true),p=>field(p,(row+1)/rows),0,false);
        const y=baseHeight+row/Math.max(1,rows-1)*rise;
        for(let i=1;i+1<poly.length;i++)emit(poly[0],poly[i],poly[i+1],()=>y);
        if(row<rows-1)poly.forEach((a,i)=>{
          const b=poly[(i+1)%poly.length];
          if(Math.abs(field(a,(row+1)/rows))<1e-5&&Math.abs(field(b,(row+1)/rows))<1e-5){
            const high=y+rise/(rows-1);
            vertices.push(a.x,y,a.y,b.x,y,b.y,a.x,high,a.y,b.x,y,b.y,b.x,high,b.y,a.x,high,a.y);
          }
        });
      }
    }
  }
  if(baseAt){
    // Close the seating platform down to its terrain datum. This adds support
    // faces only; it never moves the selected eye point or a single tread.
    // Follow the *rendered tread edges*. Joining only footprint corners made
    // a diagonal wall from the first row to the last; on tapering stands that
    // wall rose through the seats and blocked the spectator's view.
    const top=vertices.slice(),seen=new Set<string>();
    const onBoundary=(a:Vector2,b:Vector2)=>surface.points.some((p,i)=>{
      const q=surface.points[(i+1)%surface.points.length],edge=q.clone().sub(p),length=edge.lengthSq();
      if(length<1e-12)return false;
      return [a,b].every(v=>{
        const u=v.clone().sub(p).dot(edge)/length;
        return u>=-1e-6&&u<=1+1e-6&&p.clone().addScaledVector(edge,u).distanceTo(v)<1e-5;
      });
    });
    for(let i=0;i<top.length;i+=9)for(const [j,k] of [[0,1],[1,2],[2,0]]){
      const a=new Vector2(top[i+j*3],top[i+j*3+2]),b=new Vector2(top[i+k*3],top[i+k*3+2]);
      if(a.distanceToSquared(b)<1e-12||!onBoundary(a,b))continue;
      const ay=top[i+j*3+1],by=top[i+k*3+1];
      const key=[[a.x,ay,a.y],[b.x,by,b.y]].map(p=>p.map(v=>v.toFixed(5)).join(',')).sort().join('|');
      if(seen.has(key))continue;seen.add(key);
      const ag=Math.min(ay,baseAt(a)),bg=Math.min(by,baseAt(b));
      vertices.push(a.x,ag,a.y,b.x,bg,b.y,a.x,ay,a.y,b.x,bg,b.y,b.x,by,b.y,a.x,ay,a.y);
    }
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
function zonePassCenter(zoneId:string){return nearestTrack(facingTarget(zoneId,.5,.5)).distance}
const facingBranches=new WeakMap<SpectatorSurface,Vector3[]>();
function facingTarget(zoneId:string,u:number,v:number){
  const {surface,localU}=surfaceAt(zoneId,u),p=surfacePoint(surface,localU,v,true);
  // Unseated ground has no row direction. Look toward the local actual road,
  // rather than the PCA axis of an arbitrary map partition.
  if(surface.definition.terrainFollow)return nearestTrack(p).point;
  if(!surface.definition.frontReference)return nearestTrack(p).point;
  let branch=facingBranches.get(surface);
  if(!branch){
    const ref=geographic(surface.definition.frontReference),arc=nearestTrack(new Vector3(ref.x,0,ref.y)).distance;
    branch=Array.from({length:151},(_,i)=>at(arc-150+i*2));facingBranches.set(surface,branch);
  }
  // A seat faces across its local front edge, not diagonally through adjacent
  // rows toward whichever road point happens to be closest to the observer.
  // Intersect that bearing with the already recorded road branch. This search
  // never tests visibility or moves a stand, an obstacle, or the observer.
  let front=surfacePoint(surface,localU,0),axis=surface.axis,normal=surface.normal.clone().multiplyScalar(surface.frontSign);
  if(surface.definition.rowBearing==='local-normal'){
    // Curved seating rows follow the source polygon. A single PCA bearing can
    // point along an adjacent row instead of out of the seating bank.
    const a=surfacePoint(surface,Math.max(.00001,localU-.0001),v),b=surfacePoint(surface,Math.min(.99999,localU+.0001),v);
    axis=new Vector2(b.x-a.x,b.z-a.z).normalize();normal=new Vector2(-axis.y,axis.x);
    if(normal.dot(surface.normal)*surface.frontSign<0)normal.multiplyScalar(-1);
    front=p;
  }
  let across:Vector3|undefined,frontDistance=Infinity;
  for(let i=1;i<branch.length;i++){
    const a=branch[i-1],b=branch[i];
    const x=(a.x-front.x)*axis.x+(a.z-front.z)*axis.y;
    const y=(b.x-front.x)*axis.x+(b.z-front.z)*axis.y;
    if(x*y>0||Math.abs(y-x)<1e-10)continue;
    const q=a.clone().lerp(b,-x/(y-x));
    const depth=(q.x-front.x)*normal.x+(q.z-front.z)*normal.y;
    if(depth>0&&depth<frontDistance){across=q;frontDistance=depth}
  }
  if(across)return across;
  // At the edge of a short branch/corner there may be no perpendicular
  // crossing. Keep the established branch and its previous nearest target.
  let best=branch[75],distance=Infinity;
  for(const q of branch){
    const dx=q.x-p.x,dz=q.z-p.z;
    if(dx*normal.x+dz*normal.y<=0)continue;
    const d=dx*dx+dz*dz;if(d<distance){best=q;distance=d}
  }
  return best.clone();
}

return {spectatorZones,zoneById,nearestTrack,zoneSurfaces,floorHeight,surfacePoint,zonePoint,selectionAt,surfaceGeometry,zonePassCenter,facingTarget};
}
export type SpectatorModel=ReturnType<typeof createSpectators>;
