import {BufferGeometry,Float32BufferAttribute,Vector3} from 'three';
import type {CircuitPackage,CircuitBarrier} from './types';
import type {createCircuitGeometry} from './geometry';
import {geographicPoint} from './facilityGeometry';
export function validBarrier(value:unknown):value is CircuitBarrier{
 if(!value||typeof value!=='object')return false;const b=value as Partial<CircuitBarrier>;
 return typeof b.id==='string'&&['chain-link','concrete-wall'].includes(b.kind??'')&&typeof b.heightMetres==='number'&&Number.isFinite(b.heightMetres)&&b.heightMetres>0&&b.heightMetres<=12&&Array.isArray(b.coordinates)&&b.coordinates.length>=2&&b.coordinates.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>typeof n==='number'&&Number.isFinite(n)))&&(b.kind!=='concrete-wall'||b.widthMetres===undefined||Number.isFinite(b.widthMetres)&&b.widthMetres>0&&b.widthMetres<=2);
}
export const circuitBarriers=(data:CircuitPackage)=>[...data.facilities?.barriers??[],...(data.barriers?.availability!==undefined&&data.barriers.availability!=='available'?[]:data.barriers?.barriers??[])].filter(validBarrier);

/** Build once per mounted circuit. Wire cells follow ground at both endpoints;
 * exact source plan coordinates and supplied heights stay unchanged. */
export function barrierGeometry(data:CircuitPackage,g:ReturnType<typeof createCircuitGeometry>){
 const vertices:number[]=[],solidVertices:number[]=[],posts:{position:Vector3;height:number}[]=[];
 const line=(a:Vector3,b:Vector3,ha:number,hb:number)=>vertices.push(a.x,a.y+ha,a.z,b.x,b.y+hb,b.z);
 for(const barrier of circuitBarriers(data)){
  const height=barrier.heightMetres;
  const source=barrier.coordinates.map(c=>geographicPoint(g,c));
  let postRemaining=0;
  for(let i=0;i<source.length-1;i++){
   const a=source[i],b=source[i+1],length=Math.hypot(b.x-a.x,b.z-a.z);if(length<1e-6)continue;
   const ground=(t:number)=>{const p=a.clone().lerp(b,t);p.y=g.groundAt(p.x,p.z);return p};
   if(barrier.kind==='concrete-wall'){
    const width=barrier.widthMetres??.25;if(!Number.isFinite(width)||width<=0||width>2)continue;
    const n=new Vector3(-(b.z-a.z),0,b.x-a.x).normalize().multiplyScalar(width/2),count=Math.ceil(length/2);
    const emit=(p:Vector3,q:Vector3,r:Vector3)=>solidVertices.push(...p.toArray(),...q.toArray(),...r.toArray());
    for(let j=0;j<count;j++){
     const p=ground(j/count),q=ground((j+1)/count),corners=[p.clone().add(n),q.clone().add(n),q.clone().sub(n),p.clone().sub(n)];
     for(let k=0;k<4;k++){const x=corners[k],y=corners[(k+1)%4],xh=x.clone().add(new Vector3(0,height,0)),yh=y.clone().add(new Vector3(0,height,0));emit(x,y,xh);emit(y,yh,xh)}
     const top=corners.map(v=>v.clone().add(new Vector3(0,height,0)));emit(top[0],top[1],top[2]);emit(top[0],top[2],top[3]);
    }
    continue;
   }
   for(;postRemaining<length;postRemaining+=4)posts.push({position:ground(postRemaining/length),height});
   postRemaining-=length;
   const cells=Math.ceil(length/.6),rows=Math.ceil(height/.3);
   for(let j=0;j<cells;j++){
    const p=ground(j/cells),q=ground((j+1)/cells);
    for(let row=0;row<rows;row++){
     const h0=row*height/rows,h1=(row+1)*height/rows;
     line(p,q,h0,h1);line(p,q,h1,h0);
    }
    line(p,q,0,0);line(p,q,height,height);
   }
  }
  if(barrier.kind==='chain-link'){const last=source.at(-1)!;last.y=g.groundAt(last.x,last.z);posts.push({position:last,height})}
 }
 const wires=new BufferGeometry();wires.setAttribute('position',new Float32BufferAttribute(vertices,3));
 const solids=new BufferGeometry();solids.setAttribute('position',new Float32BufferAttribute(solidVertices,3));solids.computeVertexNormals();
 return {wires,posts,solids};
}
