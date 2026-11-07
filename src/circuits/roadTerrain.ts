import type {CircuitPackage} from './types';
import type {createCircuitGeometry} from './geometry';
import {terrainHeight} from './elevation';
import {geographicPoint} from './facilityGeometry';
type Sample={x:number;y:number;z:number;halfWidth:number;end?:{x:number;y:number;z:number}};
/** Local cut below road decks, never raises the DEM to a bridge or moves the road.
 * A coarse DEM cannot resolve engineering earthworks; the guard band also keeps
 * triangles between DEM vertices from covering the road's outside edge.
 */
export function roadTerrain(data:CircuitPackage,g:ReturnType<typeof createCircuitGeometry>,meshCellMetres:number){
 const buckets=new Map<string,Sample[]>(),cell=24;
 // Index the complete influence envelope once. Querying 25 neighbouring
 // string-key buckets at every terrain vertex dominated scene initialization.
 const add=(p:Sample)=>{
  const radius=p.halfWidth+meshCellMetres*1.8;
  for(let x=Math.floor((p.x-radius)/cell);x<=Math.floor((p.x+radius)/cell);x++)for(let z=Math.floor((p.z-radius)/cell);z<=Math.floor((p.z+radius)/cell);z++){
   const key=`${x},${z}`,list=buckets.get(key)??[];list.push(p);buckets.set(key,list);
  }
 };
 const count=Math.ceil(g.length/3);
 for(let i=0;i<count;i++){const p=g.at(i*g.length/count);add({...p,halfWidth:data.trackGeometry.widthMetres/2,...(data.elevation.roadModel?{end:g.at((i+1)*g.length/count)}:{})})}
 for(const lane of data.facilities?.pitLanes??[]){
  if(lane.underground)continue;
  const points=lane.coordinates.map(p=>geographicPoint(g,p,terrainHeight(data.elevation,p[0],p[1])));
  points.slice(0,-1).forEach((p,i)=>{const q=points[i+1],n=Math.max(1,Math.ceil(p.distanceTo(q)/3));for(let j=0;j<=n;j++){const point=p.clone().lerp(q,j/n);if(lane.terrainMeshSpacingMetres!==undefined)point.y=g.groundAt(point.x,point.z);add({...point,halfWidth:lane.widthMetres/2})}});
 }
 return (x:number,z:number,raw:number)=>{
  let height=raw,nearest=Infinity;
  for(const p of buckets.get(`${Math.floor(x/cell)},${Math.floor(z/cell)}`)??[]){
   const end=p.end,dx=(end?.x??p.x)-p.x,dz=(end?.z??p.z)-p.z;
   const u=end?Math.max(0,Math.min(1,((x-p.x)*dx+(z-p.z)*dz)/(dx*dx+dz*dz||1))):0;
   const y=p.y+((end?.y??p.y)-p.y)*u;
   const inner=p.halfWidth+meshCellMetres*.8,outer=inner+meshCellMetres,d2=(x-p.x-dx*u)**2+(z-p.z-dz*u)**2;
   if(d2>=outer*outer)continue;const d=Math.sqrt(d2);
   const t=Math.max(0,(d-inner)/(outer-inner)),blend=t*t*(3-2*t);
   if(data.elevation.roadModel){
    // Coarse ground cannot resolve the engineered road embankment. Connect
    // its estimated profile locally, including fill, without altering the DEM.
    if(d<nearest){nearest=d;height=y+(raw-y)*blend}
   }else height=Math.min(height,y+(raw-y)*blend);
  }
  return height;
 };
}
