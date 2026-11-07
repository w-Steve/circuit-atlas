import {BufferGeometry,Float32BufferAttribute,ShapeUtils,Vector2,Vector3} from 'three';
import type {CircuitPackage} from './types';
import type {createCircuitGeometry} from './geometry';
import {terrainHeight} from './elevation';
type Geometry=ReturnType<typeof createCircuitGeometry>;
export function geographicPoint(g:Geometry,coordinate:readonly number[],y=0){
 return new Vector3((coordinate[0]-g.origin[0])*111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration,y,-(coordinate[1]-g.origin[1])*111320*g.calibration);
}
export function buildingReference(data:CircuitPackage,g:Geometry,building:NonNullable<CircuitPackage['facilities']>['buildings'][number]){
 const points=building.boundary.slice(0,-1).map(p=>geographicPoint(g,p));
 const center=points.reduce((a,b)=>a.add(b),new Vector3()).multiplyScalar(1/points.length);
 center.y=Math.max(...building.boundary.map(p=>terrainHeight(data.elevation,p[0],p[1])))+building.heightMetres/2;return center;
}
export function buildingModel(data:CircuitPackage,g:Geometry,building:NonNullable<CircuitPackage['facilities']>['buildings'][number]){
 const points=building.boundary.slice(0,-1).map(p=>geographicPoint(g,p));
 const base=Math.max(...building.boundary.map(p=>terrainHeight(data.elevation,p[0],p[1]))),height=building.heightMetres;
 const center=points.reduce((a,b)=>a.add(b),new Vector3()).multiplyScalar(1/points.length);center.y=base+height/2;
 const walls:number[]=[],roof:number[]=[];
 for(const t of ShapeUtils.triangulateShape(points.map(p=>new Vector2(p.x,p.z)),[]))for(const i of t)roof.push(points[i].x,base+height,points[i].z);
 points.forEach((p,i)=>{const q=points[(i+1)%points.length],py=building.foundationToTerrain?Math.min(base,g.groundAt(p.x,p.z)):base,qy=building.foundationToTerrain?Math.min(base,g.groundAt(q.x,q.z)):base;walls.push(p.x,py,p.z,q.x,qy,q.z,p.x,base+height,p.z,q.x,qy,q.z,q.x,base+height,q.z,p.x,base+height,p.z)});
 const mesh=(vertices:number[])=>{const m=new BufferGeometry();m.setAttribute('position',new Float32BufferAttribute(vertices,3));m.computeVertexNormals();return m};
 return {points,base,height,center,walls:mesh(walls),roof:mesh(roof)};
}
export function pitLaneModel(data:CircuitPackage,g:Geometry,lane:NonNullable<CircuitPackage['facilities']>['pitLanes'][number]){
 const drape=(mesh:BufferGeometry)=>{
  const spacing=lane.terrainMeshSpacingMetres;if(spacing===undefined)return mesh;
  if(!Number.isFinite(spacing)||spacing<1||spacing>20){mesh.dispose();throw Error('Invalid pit terrain mesh spacing')}
  const pos=mesh.getAttribute('position'),out:number[]=[];
  const emit=(a:Vector3,b:Vector3,c:Vector3,depth=0)=>{
   const edges=[a.distanceToSquared(b),b.distanceToSquared(c),c.distanceToSquared(a)],longest=edges.indexOf(Math.max(...edges));
   if(edges[longest]>spacing*spacing){
    if(depth>24)throw Error('Pit terrain subdivision limit');
    const [p,q,r]=longest===0?[a,b,c]:longest===1?[b,c,a]:[c,a,b],mid=p.clone().lerp(q,.5);
    emit(p,mid,r,depth+1);emit(mid,q,r,depth+1);
   }else for(const p of [a,b,c])out.push(p.x,g.groundAt(p.x,p.z)+.23,p.z);
  };
  for(let i=0;i<(mesh.index?.count??pos.count);i+=3){const triangle=[0,1,2].map(j=>new Vector3().fromBufferAttribute(pos,mesh.index?mesh.index.getX(i+j):i+j));emit(triangle[0],triangle[1],triangle[2])}
  const result=new BufferGeometry();result.setAttribute('position',new Float32BufferAttribute(out,3));result.computeVertexNormals();mesh.dispose();return result;
 };
 const points=lane.coordinates.map(p=>geographicPoint(g,p,terrainHeight(data.elevation,p[0],p[1])+.23));
 if(lane.surfaceBoundary){
  const vertices:number[]=[];
  for(const polygon of lane.surfaceBoundary){
   const rings=polygon.map(r=>r.slice(0,-1).map(c=>geographicPoint(g,c,terrainHeight(data.elevation,c[0],c[1])+.23))),all=rings.flat();
   for(const tri of ShapeUtils.triangulateShape(rings[0].map(p=>new Vector2(p.x,p.z)),rings.slice(1).map(r=>r.map(p=>new Vector2(p.x,p.z)))))for(const i of tri)vertices.push(...all[i].toArray());
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return {points,geometry:drape(geometry)};
 }
 const vertices:number[]=[],indices:number[]=[];
 points.forEach((p,i)=>{const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],t=next.clone().sub(prev),n=new Vector3(-t.z,0,t.x).normalize();for(const side of [-1,1]){const q=p.clone().addScaledVector(n,side*lane.widthMetres/2);vertices.push(...q.toArray())}if(i<points.length-1){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}});
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return {points,geometry:drape(geometry)};
}
