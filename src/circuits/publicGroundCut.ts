import {ShapeUtils,Vector2} from 'three';
import type {CircuitPackage} from './types';
import type {createCircuitGeometry} from './geometry';

type Point={v:number[];index?:number};
type Cut={points:Vector2[];x0:number;x1:number;z0:number;z1:number};
const cross=(a:Vector2,b:Vector2,p:number[])=>(b.x-a.x)*(p[2]-a.y)-(b.y-a.y)*(p[0]-a.x);
const area=(poly:Point[])=>Math.abs(poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p.v[0]*q.v[2]-q.v[0]*p.v[2]},0))/2;
function halfPlane(poly:Point[],a:Vector2,b:Vector2,sign:number,inside:boolean){
 const out:Point[]=[];
 poly.forEach((p,i)=>{const q=poly[(i+1)%poly.length],x=cross(a,b,p.v)*sign,y=cross(a,b,q.v)*sign,ip=inside?x>=0:x<=0,iq=inside?y>=0:y<=0;
  if(ip)out.push(p);
  if(ip!==iq){const t=x/(x-y);out.push({v:p.v.map((value,k)=>value+(q.v[k]-value)*t)})}
 });return out;
}
/** Public ground has its own finer source-derived physical mesh. Remove only
 * the duplicate coarse terrain triangles within that exact footprint, rather
 * than lifting visitors, lowering the DEM, or drawing the ground over obstacles.
 * Attribute interpolation keeps all retained outside terrain on its old plane. */
export function cutPublicGround(data:CircuitPackage,g:ReturnType<typeof createCircuitGeometry>,vertices:number[],indices:number[],colors:number[],uvs:number[]){
 const cuts:Cut[]=[],buckets=new Map<string,number[]>(),cell=40;
 const sx=111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration,sz=111320*g.calibration;
 for(const z of data.spectatorZones)if(z.availability==='available')for(const s of z.surfaces??[])if(s.terrainFollow){
  const points=s.boundary.slice(0,-1).map(([lon,lat])=>new Vector2((lon-g.origin[0])*sx,-(lat-g.origin[1])*sz));
  for(const t of ShapeUtils.triangulateShape(points,[])){
   const p=t.map(i=>points[i]),xs=p.map(p=>p.x),zs=p.map(p=>p.y),cut={points:p,x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs)},id=cuts.length;cuts.push(cut);
   for(let x=Math.floor(cut.x0/cell);x<=Math.floor(cut.x1/cell);x++)for(let z=Math.floor(cut.z0/cell);z<=Math.floor(cut.z1/cell);z++){const key=`${x},${z}`,list=buckets.get(key)??[];list.push(id);buckets.set(key,list)}
  }
 }
 if(!cuts.length)return indices;
 const point=(index:number):Point=>({index,v:[...vertices.slice(index*3,index*3+3),...colors.slice(index*3,index*3+3),...uvs.slice(index*2,index*2+2)]});
 const emit=(p:Point)=>{if(p.index===undefined){p.index=vertices.length/3;vertices.push(...p.v.slice(0,3));colors.push(...p.v.slice(3,6));uvs.push(...p.v.slice(6,8))}return p.index};
 const result:number[]=[];
 for(let i=0;i<indices.length;i+=3){
  const ia=indices[i],ib=indices[i+1],ic=indices[i+2],x0=Math.min(vertices[ia*3],vertices[ib*3],vertices[ic*3]),x1=Math.max(vertices[ia*3],vertices[ib*3],vertices[ic*3]),z0=Math.min(vertices[ia*3+2],vertices[ib*3+2],vertices[ic*3+2]),z1=Math.max(vertices[ia*3+2],vertices[ib*3+2],vertices[ic*3+2]);let near:Set<number>|undefined;
  for(let x=Math.floor(x0/cell);x<=Math.floor(x1/cell);x++)for(let z=Math.floor(z0/cell);z<=Math.floor(z1/cell);z++){const list=buckets.get(`${x},${z}`);if(list){near??=new Set();for(const id of list)near.add(id)}}
  // The vast majority of the grid is outside public ground. Keep its original
  // indices without allocating polygon/attribute objects for those triangles.
  if(!near){result.push(ia,ib,ic);continue}
  const ids=[ia,ib,ic];
  let pieces=[ids.map(point)];
  for(const id of near){const c=cuts[id];if(c.x0>x1||c.x1<x0||c.z0>z1||c.z1<z0)continue;
   const [a,b,d]=c.points,sign=Math.sign((b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x));if(!sign)continue;
   const edges=c.points.map((p,j)=>[p,c.points[(j+1)%3]]),next:Point[][]=[];
   for(const poly of pieces){let intersection=poly;for(const [a,b] of edges)intersection=halfPlane(intersection,a,b,sign,true);
    if(intersection.length<3||area(intersection)<1e-8){next.push(poly);continue}
    let remaining=poly;for(const [a,b] of edges){const outside=halfPlane(remaining,a,b,sign,false);if(outside.length>=3&&area(outside)>1e-8)next.push(outside);remaining=halfPlane(remaining,a,b,sign,true);if(remaining.length<3)break}
   }pieces=next;if(!pieces.length)break;
  }
  for(const poly of pieces)for(let j=1;j+1<poly.length;j++)result.push(emit(poly[0]),emit(poly[j]),emit(poly[j+1]));
 }
 return result;
}
