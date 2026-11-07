import {Vector2} from 'three';

/** Paired source front/rear bend vertices define continuous rows through a bend.
 * Coordinates remain within the authored footprint; no visibility adjustment.
 */
export function createSeatingStrip(front:Vector2[],back:Vector2[],boundary:Vector2[]){
 if(front.length<2||front.length!==back.length)throw Error('Seating strip needs paired front/rear vertices');
 const edge=(a:Vector2,b:Vector2)=>boundary.some((p,i)=>{const q=boundary[(i+1)%boundary.length];return p.distanceTo(a)<1e-5&&q.distanceTo(b)<1e-5||p.distanceTo(b)<1e-5&&q.distanceTo(a)<1e-5});
 for(const chain of [front,back])for(let i=1;i<chain.length;i++)if(!edge(chain[i-1],chain[i]))throw Error('Seating strip must follow original boundary edges');
 if(!edge(front[0],back[0])||!edge(front.at(-1)!,back.at(-1)!))throw Error('Seating strip ends must match the source boundary');
 const segments=front.slice(1).map((to,i)=>({f:front[i],to,b:back[i],end:back[i+1],length:to.distanceTo(front[i])}));
 for(const s of segments){
  const q=[s.f,s.to,s.end,s.b],turns=q.map((p,i)=>q[(i+1)%4].clone().sub(p).cross(q[(i+2)%4].clone().sub(q[(i+1)%4])));
  if(s.length<1e-6||turns.some(t=>Math.abs(t)<1e-8)||turns.some(t=>t*turns[0]<0))throw Error('Folded or degenerate seating strip');
 }
 const total=segments.reduce((v,s)=>v+s.length,0);
 const point=(i:number,u:number,v:number)=>segments[i].f.clone().lerp(segments[i].to,u).lerp(segments[i].b.clone().lerp(segments[i].end,u),v);
 function at(u:number,v:number){
  let distance=Math.max(0,Math.min(1,u))*total;
  for(let i=0;i<segments.length;i++){const s=segments[i];if(distance<=s.length||i===segments.length-1)return point(i,distance/s.length,v);distance-=s.length}
  throw Error('Invalid seating strip');
 }
 function inverse(p:Vector2,clamp=false):{u:number;v:number}{
  let offset=0;
  for(let i=0;i<segments.length;i++){
   const s=segments[i],a=s.to.clone().sub(s.f),b=s.b.clone().sub(s.f),c=s.end.clone().sub(s.b).sub(a);let u=.5,v=.5;
   for(let iteration=0;iteration<12;iteration++){
    const residual=s.f.clone().addScaledVector(a,u).addScaledVector(b,v).addScaledVector(c,u*v).sub(p),du=a.clone().addScaledVector(c,v),dv=b.clone().addScaledVector(c,u),det=du.cross(dv);
    if(Math.abs(det)<1e-10)break;
    u-=residual.cross(dv)/det;v-=du.cross(residual)/det;
    if(residual.lengthSq()<1e-16)break;
   }
   if(u>=-1e-6&&u<=1+1e-6&&v>=-1e-6&&v<=1+1e-6&&point(i,u,v).distanceToSquared(p)<1e-8)return {u:(offset+Math.max(0,Math.min(1,u))*s.length)/total,v:Math.max(0,Math.min(1,v))};
   offset+=s.length;
  }
  if(clamp){
   let best=boundary[0],distance=Infinity;
   for(let i=0;i<boundary.length;i++){
    const a=boundary[i],edge=boundary[(i+1)%boundary.length].clone().sub(a),t=Math.max(0,Math.min(1,p.clone().sub(a).dot(edge)/edge.lengthSq())),q=a.clone().addScaledVector(edge,t),d=q.distanceToSquared(p);
    if(d<distance){distance=d;best=q}
   }
   return inverse(best);
  }
  throw Error('Point lies outside its seating strip');
 }
 return {segments,point,at,inverse};
}
