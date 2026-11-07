/** Diagnostic only: test existing seat-bank and road occlusion without moving eyes. */
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {mapRoad} from '../src/circuits/mapRoad';
import {cockpitAt} from '../src/systems/VehicleDynamics';
import {buildingModel} from '../src/circuits/facilityGeometry';
const runtime=createCircuitContext(await loadCircuit('montreal')),m=runtime.spectators;
const material=new MeshBasicMaterial({side:DoubleSide}),objects:Mesh[]=[];
for(const [id,surfaces] of m.zoneSurfaces)for(const s of surfaces){
 if(s.zone.kind!=='grandstand')continue;
 const mesh=new Mesh(m.surfaceGeometry(s,s.zone.supportToTerrain===false?undefined:p=>runtime.geometry.groundAt(p.x,p.y)-.15),material);mesh.name=id;mesh.updateMatrixWorld(true);objects.push(mesh);
}
for(const b of runtime.data.facilities?.buildings??[]){const model=buildingModel(runtime.data,runtime.geometry,b);for(const g of [model.walls,model.roof]){const mesh=new Mesh(g,material);mesh.name=`building:${b.id}`;mesh.updateMatrixWorld(true);objects.push(mesh)}}
const roads=mapRoad(runtime.geometry,runtime.data.trackGeometry.widthMetres,.2);
for(const [name,g] of [['road',roads.road],['verge',roads.verge]] as const){const mesh=new Mesh(g,material);mesh.name=name;mesh.updateMatrixWorld(true);objects.push(mesh)}
try{
 const zone='ga-t6-family',surface=m.zoneSurfaces.get(zone)![0],center=m.zonePassCenter(zone);
 const rows=[];
 for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
  const eye=m.surfacePoint(surface,u,v,true),floor=m.surfacePoint(surface,u,v);
  const samples=[];
  for(let offset=-160;offset<=160;offset+=20){
   const target=cockpitAt(center+offset,runtime.geometry),distance=eye.distanceTo(target);
   const hit=new Raycaster(eye,target.clone().sub(eye).normalize(),.001,distance-.001).intersectObjects(objects)[0];
   samples.push({offset,blocker:hit?.object.name??null});
  }
  rows.push({u,v,eye:eye.toArray(),eyeAboveGround:eye.y-floor.y,clearTestedGeometryRays:samples.filter(a=>!a.blocker).length,samples});
 }
 const report={circuitId:'montreal',zoneId:zone,checkedAt:'2026-11-06',packageSha256:createHash('sha256').update(readFileSync('src/circuits/generated/montreal.json')).digest('hex'),
 scope:'Rendered seat banks including terrain supports, registered building walls/roofs and actual road/verge. Clear rays do not prove full visibility: fences, separate terrain and other spectators are outside this diagnostic. No coordinate, eye, model or simulation mutation.',rows};
 writeFileSync('src/circuits/season-review/montreal-t6-occlusion-2026.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(rows.map(({u,v,clearTestedGeometryRays})=>({u,v,clearTestedGeometryRays}))));
}finally{for(const mesh of objects)mesh.geometry.dispose();material.dispose()}
