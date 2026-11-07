import {it,expect} from 'vitest';
import {Vector2,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {europeanCircuits,asiaPacificCircuits,americanCircuits} from '../src/circuits/regions';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {mapRoad} from '../src/circuits/mapRoad';
const cross=(a:Vector2,b:Vector2,c:Vector2)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
for(const id of [...americanCircuits,...europeanCircuits,...asiaPacificCircuits.filter(id=>id!=='shanghai')])it(`${id}: every exposed stand clears the full rendered road and faces its recorded branch`,async()=>{
 const data=await loadCircuit(id),g=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
 const model=createSpectators(data.spectatorZones,g),mesh=mapRoad(g,data.trackGeometry.widthMetres),p=mesh.road.getAttribute('position'),indices=mesh.road.index!;
 const triangles=Array.from({length:indices.count/3},(_,i)=>[0,1,2].map(j=>{const k=indices.getX(i*3+j);return new Vector2(p.getX(k),p.getZ(k))}));
 for(const surface of [...model.zoneSurfaces.values()].flat()){
  if(surface.zone.kind==='grandstand'){if(surface.definition.frontReference)expect(surface.definition.frontReference).toHaveLength(2);else expect(surface.definition.rowStrip??surface.definition.rowFrontEdge).toBeDefined()}
  expect(surface.zone.geometryReview?.issues??[]).toEqual([]);
  const ring=surface.points,minX=Math.min(...ring.map(p=>p.x)),maxX=Math.max(...ring.map(p=>p.x)),minZ=Math.min(...ring.map(p=>p.y)),maxZ=Math.max(...ring.map(p=>p.y));
  // Clip each polygon against the actual rendered triangle, retaining the
  // existing 0.1m² spatial-screen tolerance for numerical boundary slivers.
  let overlap=0;
  for(const triangle of triangles){
   if(triangle.every(p=>p.x<minX)||triangle.every(p=>p.x>maxX)||triangle.every(p=>p.y<minZ)||triangle.every(p=>p.y>maxZ))continue;
   let clipped=ring.map(p=>p.clone());const sign=Math.sign(cross(...triangle as [Vector2,Vector2,Vector2]));
   for(let k=0;k<3;k++){
    const a=triangle[k],b=triangle[(k+1)%3],out:Vector2[]=[];
    for(let i=0;i<clipped.length;i++){
     const c=clipped[i],d=clipped[(i+1)%clipped.length],dc=sign*cross(a,b,c),dd=sign*cross(a,b,d);
     if(dc>=0)out.push(c);
     if((dc>=0)!==(dd>=0))out.push(c.clone().lerp(d,dc/(dc-dd)));
    }clipped=out;
   }
   overlap+=Math.abs(clipped.reduce((sum,p,i)=>{const q=clipped[(i+1)%clipped.length];return sum+p.x*q.y-q.x*p.y},0))/2;
  }
  expect(overlap,surface.definition.surfaceId+' rendered-road intersection m²').toBeLessThanOrEqual(.1);
  const front=model.surfacePoint(surface,.5,0),back=model.surfacePoint(surface,.5,1);
  const ref=surface.definition.frontReference;
  if(ref){
  const x=(ref[0]-g.origin[0])*111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration;
  const z=-(ref[1]-g.origin[1])*111320*g.calibration;
  expect((front.x-back.x)*(x-surface.center.x)+(front.z-back.z)*(z-surface.center.y)).toBeGreaterThan(0);
  }
   if(surface.definition.rows>1)expect(back.y).toBeGreaterThan(front.y);
   else if(surface.definition.rows===1){expect(back.y).toBeCloseTo(front.y,8);expect(surface.definition.rise).toBe(0)}
  else {expect(surface.zone.kind).not.toBe('grandstand');expect(surface.definition.rise).toBe(0)}
  for(const u of [.1,.5,.9]){
   const selected=model.selectionAt(surface,model.surfacePoint(surface,u,.8));
   const eye=model.zonePoint(selected.zoneId,selected.u,selected.v),target=model.facingTarget(selected.zoneId,selected.u,selected.v);
   if(surface.definition.terrainFollow){
    const road=surface.definition.viewRoadReference;
    if(!road)expect(target.distanceTo(model.nearestTrack(eye).point),surface.definition.surfaceId+' unseated ground faces its local road').toBeLessThan(.001);
    else{
     const ref=new Vector3((road.coordinate[0]-g.origin[0])*111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration,0,-(road.coordinate[1]-g.origin[1])*111320*g.calibration);
     const arc=model.nearestTrack(ref).distance,actual=model.nearestTrack(target),delta=Math.abs(actual.distance-arc);
     expect(Math.min(delta,g.length-delta),surface.definition.surfaceId+' faces its sourced road branch').toBeLessThan(150.02);
     expect(target.distanceTo(actual.point),'Target remains on real road').toBeLessThan(.02);
    }
   }
   else if(surface.zone.kind==='grandstand')expect(((target.x-eye.x)*surface.normal.x+(target.z-eye.z)*surface.normal.y)*surface.frontSign,surface.definition.surfaceId+' default view faces seating front').toBeGreaterThan(0);
  }
 }
 expect(data.spectatorZoneIds).toEqual(model.spectatorZones.map(z=>z.zoneId));
 mesh.road.dispose();mesh.verge.dispose();
});
