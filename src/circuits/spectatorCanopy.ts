import {BoxGeometry,BufferGeometry,Float32BufferAttribute,ShapeUtils,Vector2,Vector3} from 'three';
import type {SpectatorModel,SpectatorSurface} from './spectators';

/** Static source-configured occluders shared by live views and photo rendering.
 * Clearance is measured above the last row, not added to the observer. */
export function spectatorCanopy(surface:SpectatorSurface,model:Pick<SpectatorModel,'surfacePoint'|'floorHeight'>){
 const config=surface.definition.canopy;if(!config)return null;
 const {rearClearanceMetres,crownMetres,postWidthMetres,supportU,supportEdges}=config;
 if(surface.zone.kind!=='grandstand'||![rearClearanceMetres,crownMetres,postWidthMetres,...supportU].every(Number.isFinite)||rearClearanceMetres<=0||crownMetres<0||postWidthMetres<=0||supportU.length<2||supportU.some(u=>u<0||u>1))throw Error('Invalid spectator canopy configuration');
 const floor=(u:number,v:number)=>model.surfacePoint(surface,u,v,false);
 const datum=Math.max(...[0,.25,.5,.75,1].map(u=>floor(u,1).y))+rearClearanceMetres;
 const start=config.coverageStartV??0;
 if(!Number.isFinite(start)||start<0||start>=1||start>0&&surface.strip)throw Error('Invalid partial canopy coverage');
 let ring=surface.points;
 if(start>0){
  // Partial roofs are clipped in the actual footprint, never a replacement box.
  // This depth plane is for straight banks; curved row strips require their own boundary.
  const ns=ring.map(p=>p.clone().sub(surface.center).dot(surface.normal));
  const lo=Math.min(...ns),hi=Math.max(...ns),cut=surface.frontSign>0?hi-start*(hi-lo):lo+start*(hi-lo);
  const distance=(p:Vector2)=>(cut-p.clone().sub(surface.center).dot(surface.normal))*surface.frontSign;
  const clipped:Vector2[]=[];
  for(let i=0;i<ring.length;i++){
   const a=ring[i],b=ring[(i+1)%ring.length],da=distance(a),db=distance(b);
   if(da>=0)clipped.push(a.clone());
   if((da>=0)!==(db>=0))clipped.push(a.clone().lerp(b,da/(da-db)));
  }
  if(clipped.length<3)throw Error('Empty partial canopy');
  ring=clipped;
 }
 const projected=ring.map(p=>p.dot(surface.normal)),min=Math.min(...projected),depth=Math.max(...projected)-min;
 const roofPoint=(p:Vector2)=>new Vector3(p.x,datum+Math.sin(Math.PI*(p.dot(surface.normal)-min)/depth)*crownMetres,p.y);
 const roofVertices:number[]=[],postVertices:number[]=[];
 const triangle=(a:Vector3,b:Vector3,c:Vector3)=>roofVertices.push(...a.toArray(),...b.toArray(),...c.toArray());
 // Triangulate the actual geographic ring. PCA selection endpoints can collapse
 // to vertices on a skew footprint and are not the four roof corners.
 const split=(a:Vector2,b:Vector2,c:Vector2,level:number):void=>{
  if(!level){triangle(roofPoint(a),roofPoint(b),roofPoint(c));return}
  const ab=a.clone().lerp(b,.5),bc=b.clone().lerp(c,.5),ca=c.clone().lerp(a,.5);
  split(a,ab,ca,level-1);split(ab,b,bc,level-1);split(ca,bc,c,level-1);split(ab,bc,ca,level-1);
 };
 for(const [a,b,c] of ShapeUtils.triangulateShape(ring,[]))split(ring[a],ring[b],ring[c],2);
 const edges=start>0?ring.map((a,i)=>[a,ring[(i+1)%ring.length]]).sort((a,b)=>b[0].distanceToSquared(b[1])-a[0].distanceToSquared(a[1])).slice(0,2):supportEdges.map(edge=>{
  if(edge.some(i=>!Number.isInteger(i)||!surface.points[i]))throw Error('Invalid canopy support edge');
  return edge.map(i=>surface.points[i]);
 });
 for(const [v,edge] of edges.entries())for(const u of supportU){
  const point=edge[0].clone().lerp(edge[1],u);
  const localU=Math.max(0,Math.min(1,(point.clone().sub(surface.center).dot(surface.axis)-surface.min)/(surface.max-surface.min)));
  const a=new Vector3(point.x,start>0?model.floorHeight(surface,point):floor(localU,v).y,point.y),b=roofPoint(point),height=b.y-a.y;
  if(height<=0)throw Error('Canopy support intersects seating');
  const box=new BoxGeometry(postWidthMetres,height,postWidthMetres).translate(a.x,a.y+height/2,a.z);
  const positions=box.getAttribute('position'),index=box.getIndex()!;
  for(let i=0;i<index.count;i++){const j=index.getX(i);postVertices.push(positions.getX(j),positions.getY(j),positions.getZ(j))}
  box.dispose();
 }
 const geometry=(vertices:number[])=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g};
 return {roof:geometry(roofVertices),posts:geometry(postVertices)};
}
