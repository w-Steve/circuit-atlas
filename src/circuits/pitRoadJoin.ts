import {BufferGeometry,Float32BufferAttribute} from 'three';

type Point=[number,number,number];
type Triangle={p:Point[];x0:number;x1:number;z0:number;z1:number;sign:number};
const cross=(a:Point,b:Point,p:Point)=>(b[0]-a[0])*(p[2]-a[2])-(b[2]-a[2])*(p[0]-a[0]);
const area=(p:Point[])=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[2]-b[0]*a[2]},0))/2;
const height=(t:Triangle,p:Point)=>{
 const [a,b,c]=t.p,den=cross(a,b,c),u=cross(p,b,c)/den,v=cross(a,p,c)/den;
 return u*a[1]+v*b[1]+(1-u-v)*c[1];
};
function half(poly:Point[],a:Point,b:Point,sign:number,inside:boolean,road:Triangle){
 const out:Point[]=[];
 poly.forEach((p,i)=>{
  const q=poly[(i+1)%poly.length],x=cross(a,b,p)*sign,y=cross(a,b,q)*sign;
  const ip=inside?x>=0:x<=0,iq=inside?y>=0:y<=0;
  if(ip)out.push(p);
  if(ip!==iq){const u=x/(x-y),r=p.map((v,k)=>v+(q[k]-v)*u) as Point;
   // The shared racing mesh owns junction elevation. Outside pit geometry
   // meets that exact boundary, without moving its horizontal source footprint.
   r[1]=height(road,r);out.push(r);
  }
 });return out;
}

/** Union the visible pavement at same-level pit junctions. The racing mesh is
 * authoritative in the overlap; retain all pit pavement outside it and connect
 * its cut edge to the same elevation. Do not join grade-separated crossings.
 * Index once per mounted road, with no mutable global cache or GPU allocation. */
export function createPitRoadJoin(road:BufferGeometry,verge?:BufferGeometry){
 const buckets=new Map<string,Triangle[]>(),cell=32;
 for(const deck of verge?[road,verge]:[road]){
 const position=deck.getAttribute('position'),index=deck.index;
 const point=(i:number):Point=>[position.getX(i),position.getY(i),position.getZ(i)];
 for(let i=0;i<(index?.count??position.count);i+=3){
  const p=[0,1,2].map(j=>point(index?index.getX(i+j):i+j)),sign=Math.sign(cross(p[0],p[1],p[2]));if(!sign)continue;
  const t={p,sign,x0:Math.min(...p.map(v=>v[0])),x1:Math.max(...p.map(v=>v[0])),z0:Math.min(...p.map(v=>v[2])),z1:Math.max(...p.map(v=>v[2]))};
  for(let x=Math.floor(t.x0/cell);x<=Math.floor(t.x1/cell);x++)for(let z=Math.floor(t.z0/cell);z<=Math.floor(t.z1/cell);z++){
   const key=`${x},${z}`,list=buckets.get(key)??[];list.push(t);buckets.set(key,list);
  }
 }
 }
 return (pit:BufferGeometry)=>{
  const pos=pit.getAttribute('position'),ids=pit.index,vertices:number[]=[];
  for(let i=0;i<(ids?.count??pos.count);i+=3){
   const original=[0,1,2].map(j=>{const k=ids?ids.getX(i+j):i+j;return [pos.getX(k),pos.getY(k),pos.getZ(k)] as Point});
   const x0=Math.min(...original.map(p=>p[0])),x1=Math.max(...original.map(p=>p[0])),z0=Math.min(...original.map(p=>p[2])),z1=Math.max(...original.map(p=>p[2]));
   const near=new Set<Triangle>();
   for(let x=Math.floor(x0/cell);x<=Math.floor(x1/cell);x++)for(let z=Math.floor(z0/cell);z<=Math.floor(z1/cell);z++)for(const t of buckets.get(`${x},${z}`)??[])near.add(t);
   let pieces=[original];
   for(const t of near){
    if(t.x0>x1||t.x1<x0||t.z0>z1||t.z1<z0)continue;
    const edges=t.p.map((p,j)=>[p,t.p[(j+1)%3]]),next:Point[][]=[];
    for(const poly of pieces){
     // First test overlap without replacing heights, so a bridge remains intact.
     let intersection=poly;
     for(const [a,b] of edges)intersection=half(intersection,a,b,t.sign,true,t);
     // Use original pit plane, not the newly interpolated road heights.
     const plane:Triangle={...t,p:original,sign:1};
     if(intersection.length<3||area(intersection)<1e-8||intersection.some(p=>Math.abs(height(plane,p)-height(t,p))>1)){
      next.push(poly);continue;
     }
     let remaining=poly;
     for(const [a,b] of edges){
      const outside=half(remaining,a,b,t.sign,false,t);
      if(outside.length>=3&&area(outside)>1e-8)next.push(outside);
      remaining=half(remaining,a,b,t.sign,true,t);if(remaining.length<3)break;
     }
    }
    pieces=next;if(!pieces.length)break;
   }
   for(const poly of pieces)for(let j=1;j+1<poly.length;j++)vertices.push(...poly[0],...poly[j],...poly[j+1]);
  }
  const result=new BufferGeometry();result.setAttribute('position',new Float32BufferAttribute(vertices,3));result.computeVertexNormals();return result;
 };
}
