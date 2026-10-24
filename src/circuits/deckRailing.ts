import {BufferGeometry,Float32BufferAttribute,Vector3} from 'three';
import type {SpectatorSurface,SpectatorModel} from './spectators';

/** Elevated front safety rail, separate from a ground-level track catch fence.
 * Approximate 40mm square metal members; actual height/source are per surface. */
export function deckRailing(surface:SpectatorSurface,model:Pick<SpectatorModel,'surfacePoint'>){
 const height=surface.definition.frontRailing?.heightMetres,vertices:number[]=[];
 if(height){
  const member=(a:Vector3,b:Vector3)=>{
   const d=b.clone().sub(a).normalize();if(a.distanceToSquared(b)<1e-8)return;
   const u=new Vector3().crossVectors(d,Math.abs(d.y)>.9?new Vector3(1,0,0):new Vector3(0,1,0)).normalize().multiplyScalar(.02),v=new Vector3().crossVectors(d,u).normalize().multiplyScalar(.02);
   const ring=(p:Vector3)=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>p.clone().addScaledVector(u,x).addScaledVector(v,y));
   const r=ring(a),s=ring(b),emit=(a:Vector3,b:Vector3,c:Vector3)=>vertices.push(...a.toArray(),...b.toArray(),...c.toArray());
   for(let i=0;i<4;i++){const j=(i+1)%4;emit(r[i],r[j],s[i]);emit(r[j],s[j],s[i])}
   emit(r[0],r[2],r[1]);emit(r[0],r[3],r[2]);emit(s[0],s[1],s[2]);emit(s[0],s[2],s[3]);
  };
  const width=surface.max-surface.min,count=Math.max(2,Math.ceil(width/2));
  const cuts=new Set(Array.from({length:count+1},(_,i)=>i/count));
  surface.points.forEach(p=>cuts.add(Math.max(0,Math.min(1,((p.x-surface.center.x)*surface.axis.x+(p.y-surface.center.y)*surface.axis.y-surface.min)/width))));
  const front=[...cuts].sort((a,b)=>a-b).map(u=>model.surfacePoint(surface,u,0));
  front.forEach((p,i)=>{
   member(p,p.clone().add(new Vector3(0,height,0)));
   if(i)for(const h of [height*.5,height])member(front[i-1].clone().add(new Vector3(0,h,0)),p.clone().add(new Vector3(0,h,0)));
  });
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
