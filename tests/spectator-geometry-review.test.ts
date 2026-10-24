import {it,expect} from 'vitest';
import {Vector2} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {europeanCircuits,asiaPacificCircuits,americanCircuits} from '../src/circuits/regions';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {mapRoad} from '../src/circuits/mapRoad';
const cross=(a:Vector2,b:Vector2,c:Vector2)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const inside=(p:Vector2,ring:Vector2[])=>{
 let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;
 }return yes;
};
const crosses=(a:Vector2,b:Vector2,c:Vector2,d:Vector2)=>cross(a,b,c)*cross(a,b,d)<-1e-8&&cross(c,d,a)*cross(c,d,b)<-1e-8;
for(const id of [...americanCircuits,...europeanCircuits,...asiaPacificCircuits.filter(id=>id!=='shanghai')])it(`${id}: every exposed stand clears the full rendered road and faces its recorded branch`,async()=>{
 const data=await loadCircuit(id),g=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
 const model=createSpectators(data.spectatorZones,g),mesh=mapRoad(g,data.trackGeometry.widthMetres),p=mesh.road.getAttribute('position'),indices=mesh.road.index!;
 const triangles=Array.from({length:indices.count/3},(_,i)=>[0,1,2].map(j=>{const k=indices.getX(i*3+j);return new Vector2(p.getX(k),p.getZ(k))}));
 for(const surface of [...model.zoneSurfaces.values()].flat()){
  expect(surface.definition.frontReference).toHaveLength(2);
  expect(surface.zone.geometryReview?.issues).toEqual([]);
  const ring=surface.points,minX=Math.min(...ring.map(p=>p.x)),maxX=Math.max(...ring.map(p=>p.x)),minZ=Math.min(...ring.map(p=>p.y)),maxZ=Math.max(...ring.map(p=>p.y));
  for(const triangle of triangles){
   if(triangle.every(p=>p.x<minX)||triangle.every(p=>p.x>maxX)||triangle.every(p=>p.y<minZ)||triangle.every(p=>p.y>maxZ))continue;
   expect(triangle.some(p=>inside(p,ring)),surface.definition.surfaceId+' road inside stand').toBe(false);
   expect(ring.some(p=>inside(p,triangle)),surface.definition.surfaceId+' stand inside road').toBe(false);
   expect(ring.some((a,i)=>triangle.some((c,j)=>crosses(a,ring[(i+1)%ring.length],c,triangle[(j+1)%3]))),surface.definition.surfaceId+' edges cross road').toBe(false);
  }
  const front=model.surfacePoint(surface,.5,0),back=model.surfacePoint(surface,.5,1);
  const ref=surface.definition.frontReference!;
  const x=(ref[0]-g.origin[0])*111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration;
  const z=-(ref[1]-g.origin[1])*111320*g.calibration;
  expect((front.x-back.x)*(x-surface.center.x)+(front.z-back.z)*(z-surface.center.y)).toBeGreaterThan(0);
  if(surface.definition.rows>0)expect(back.y).toBeGreaterThan(front.y);
  else expect(surface.definition.terrainFollow).toBe(true);
  for(const u of [.1,.5,.9]){
   const selected=model.selectionAt(surface,model.surfacePoint(surface,u,.8));
   const eye=model.zonePoint(selected.zoneId,selected.u,selected.v),target=model.facingTarget(selected.zoneId,selected.u,selected.v);
   if(surface.definition.terrainFollow)expect(target.distanceTo(model.nearestTrack(eye).point),surface.definition.surfaceId+' unseated ground faces its local road').toBeLessThan(.001);
   else expect(((target.x-eye.x)*surface.normal.x+(target.z-eye.z)*surface.normal.y)*surface.frontSign,surface.definition.surfaceId+' default view faces seating front').toBeGreaterThan(0);
  }
 }
 expect(data.spectatorZoneIds).toEqual(model.spectatorZones.map(z=>z.zoneId));
 mesh.road.dispose();mesh.verge.dispose();
});
