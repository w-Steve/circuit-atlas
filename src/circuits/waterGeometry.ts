import {BufferGeometry,Float32BufferAttribute,ShapeUtils,Vector2} from 'three';
import type {CircuitPackage} from './types';
import type {createCircuitGeometry} from './geometry';
import {geographicPoint} from './facilityGeometry';

function inside(x:number,z:number,ring:Vector2[]){
 let hit=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)hit=!hit;
 }
 return hit;
}
/** Pure display layer: source DEM, road decks and seated eye heights stay intact. */
export function waterGeometry(data:CircuitPackage,g:ReturnType<typeof createCircuitGeometry>){
 const features=(data.water?.features??[]).map(f=>{
  const rings=f.rings.map(r=>r.slice(0,-1).map(c=>{const p=geographicPoint(g,c);return new Vector2(p.x,p.z)}));
  const xs=rings[0].map(p=>p.x),zs=rings[0].map(p=>p.y);
  return {rings,y:f.altitudeMetres-(data.elevation.grid?.referenceAltitude??0),bounds:[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)]};
 });
 const levelAt=(x:number,z:number)=>{
  for(const f of features){const [w,s,e,n]=f.bounds;
   if(x<w||x>e||z<s||z>n)continue;
   if(inside(x,z,f.rings[0])&&!f.rings.slice(1).some(r=>inside(x,z,r)))return f.y;
  }
  return null;
 };
 const vertices:number[]=[];
 for(const f of features){
  const all=f.rings.flat();
  for(const tri of ShapeUtils.triangulateShape(f.rings[0],f.rings.slice(1)))for(const i of tri){const p=all[i];vertices.push(p.x,f.y+.015,p.y)}
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
 return {geometry,levelAt,featureCount:features.length};
}
