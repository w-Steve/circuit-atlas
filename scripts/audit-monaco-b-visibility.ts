// Replay a saved candidate exposure against the actual road and spectator meshes.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DoubleSide,Mesh,MeshBasicMaterial,Object3D,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {mapRoad} from '../src/circuits/mapRoad';
import {carDimensions,cockpitAt,placeVehicle} from '../src/systems/VehicleDynamics';
import defaultSource from '../src/circuits/europe/monaco-b-2026.json';
const [input,output,sourcePath]=process.argv.slice(2);
if(!input||!output)throw Error('Expected saved exposure and output paths');
const source:typeof defaultSource=sourcePath?JSON.parse(readFileSync(sourcePath,'utf8')):defaultSource,zoneId=source.zone.zoneId;
if(source.circuitId!=='monaco'||source.season!==2026||source.zone.kind!=='grandstand')throw Error('Expected Monaco2026 grandstand source');
const {meta}=JSON.parse(readFileSync(input,'utf8'));
if(meta.zoneId!==zoneId)throw Error('Exposure does not match the selected stand source');
const d=await loadCircuit('monaco'),candidate={...source.zone,availability:'available'} as typeof d.spectatorZones[number];
const ctx=createCircuitContext({...d,spectatorZones:d.spectatorZones.map(z=>z.zoneId===zoneId?candidate:z)}),g=ctx.geometry;
const eye=new Vector3(...meta.observerPosition as [number,number,number]),target=cockpitAt(meta.distance,g),distance=eye.distanceTo(target);
const coreHash=createHash('sha256').update(JSON.stringify({trackGeometry:d.trackGeometry,corners:d.corners,elevation:d.elevation})).digest('hex');
const surface=ctx.spectators.zoneSurfaces.get(zoneId)![0];
const pick=ctx.spectators.selectionAt(surface,eye.clone().sub(new Vector3(0,1.2,0)));
if(ctx.spectators.zonePoint(zoneId,pick.u,pick.v).distanceTo(eye)>1e-4)throw Error('Saved exposure no longer matches the candidate observer surface');
const material=new MeshBasicMaterial({side:DoubleSide}),roads=mapRoad(g,d.trackGeometry.widthMetres,.2),objects:Mesh[]=[];
const add=(name:string,geometry:typeof roads.road)=>{const mesh=new Mesh(geometry,material);mesh.name=name;mesh.updateMatrixWorld(true);objects.push(mesh)};
add('road',roads.road);add('verge',roads.verge);
for(const surfaces of ctx.spectators.zoneSurfaces.values())for(const s of surfaces)add(s.definition.surfaceId,ctx.spectators.surfaceGeometry(s));
try{
 const intersections=new Raycaster(eye,target.clone().sub(eye).normalize(),.001,distance-.001).intersectObjects(objects).map(h=>({object:h.object.name,distanceMetres:h.distance,point:h.point.toArray()}));
 const report={circuitId:'monaco',zoneId:meta.zoneId,coreInputsSha256:coreHash,candidateGeometrySha256:createHash('sha256').update(JSON.stringify({...source.zone,availability:undefined,geometryReview:undefined})).digest('hex'),exposure:meta,observerPosition:eye.toArray(),cockpitPosition:target.toArray(),distanceMetres:distance,groundAtEye:g.groundAt(eye.x,eye.z),roadCentre:g.at(meta.distance).toArray(),intersections,scope:zoneId==='b-casino'?'Model road/verge/stand ray only; confirms this saved ray hits own seating, not whether this estimated section matches real Casino grandstand.':'Saved model ray through road/verge/stand meshes; intersections do not certify the estimated stand profile or actual venue visibility.'};
 if(zoneId==='v-anthony-noghes'){
  const frame=new Object3D();placeVehicle(frame,meta.distance,g);
  const wheelReferenceRays=[-1,1].flatMap(side=>[-1,1].map(axle=>{
   const target=frame.localToWorld(new Vector3(side*(carDimensions.width/2-.16),.36,axle*carDimensions.wheelbase/2)),length=eye.distanceTo(target);
   const hits=new Raycaster(eye,target.clone().sub(eye).normalize(),.001,length-.001).intersectObjects(objects).map(h=>({object:h.object.name,distanceMetres:h.distance}));
   return {side,axle,target:target.toArray(),distanceMetres:length,intersections:hits};
  }));
  Object.assign(report,{wheelReferenceRays});
 }
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{for(const m of objects)m.geometry.dispose();material.dispose()}
