import {BufferGeometry,Float32BufferAttribute,Vector3} from 'three';
import type {createCircuitGeometry} from './geometry';
// Separate edge strips, never a broad filled underlay spanning neighbouring roads.
export function mapRoad(g:ReturnType<typeof createCircuitGeometry>,width:number,surfaceOffset=.4){
  const n=1200,points=Array.from({length:n},(_,i)=>g.at(i*g.length/n));
  const tangents=points.map((_,i)=>g.tangent(i*g.length/n));
  const widths=points.map((p,i)=>{
    let gap=Infinity;
    for(let j=0;j<n;j++){
      const delta=Math.min(Math.abs(i-j),n-Math.abs(i-j));
      if(delta*g.length/n<70||Math.abs(tangents[i].dot(tangents[j]))<.75)continue;
      const q=points[j],d=Math.hypot(q.x-p.x,q.z-p.z);
      if(Math.abs(q.y-p.y)<3)gap=Math.min(gap,d);
    }
    return Math.max(3,Math.min(width,gap*.65));
  });
  function strip(edge:boolean){
    const vertices:number[]=[],indices:number[]=[];
    for(const side of edge?[-1,1]:[0]){
      const base=vertices.length/3;
      for(let i=0;i<=n;i++){
        const k=i%n,p=points[k],t=tangents[k],normal=new Vector3(-t.z,0,t.x).normalize(),w=widths[k];
        const offsets=edge?[side*w/2,side*(w/2+Math.min(1.2,w*.12))]:[-w/2,w/2];
        for(const offset of offsets){const q=p.clone().addScaledVector(normal,offset);vertices.push(q.x,p.y+surfaceOffset+(edge?.02:0),q.z)}
        if(i<n){const a=base+i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}
      }
    }
    const result=new BufferGeometry();result.setAttribute('position',new Float32BufferAttribute(vertices,3));result.setIndex(indices);result.computeVertexNormals();return result;
  }
  return {road:strip(false),verge:strip(true),widths};
}
