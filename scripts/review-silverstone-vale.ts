// Candidate review only: export real shared-engine plan geometry, never edit runtime data.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {mapRoad} from '../src/circuits/mapRoad';
import {pitLaneModel} from '../src/circuits/facilityGeometry';
import type {SpectatorZone,CircuitBarrierPackage} from '../src/circuits/types';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
const source=JSON.parse(readFileSync('src/circuits/europe/silverstone-vale-2026.json','utf8'));
const data=structuredClone(await loadCircuit('silverstone'));
data.spectatorZones=data.spectatorZones.filter(z=>z.zoneId!==source.zone.zoneId);
data.spectatorZones.push({...source.zone,availability:'available'} as SpectatorZone);
data.barriers={...source.barrierLayer,availability:'available',barriers:[...(data.barriers?.barriers??[]).filter(b=>!source.zone.requiredBarrierIds.includes(b.id)),...source.barrierLayer.barriers]} as CircuitBarrierPackage;
const rt=createCircuitContext(data),g=rt.geometry;
const xy=(c:number[])=>[(c[0]-g.origin[0])*111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration,-(c[1]-g.origin[1])*111320*g.calibration];
const triangles=(mesh:ReturnType<typeof mapRoad>['road'])=>{
 const p=mesh.getAttribute('position'),index=mesh.index;
 return Array.from({length:(index?.count??p.count)/3},(_,i)=>[0,1,2].map(j=>{const k=index?index.getX(3*i+j):3*i+j;return[p.getX(k),p.getZ(k)]}));
};
const road=mapRoad(g,data.trackGeometry.widthMetres),roads=triangles(road.road);road.road.dispose();road.verge.dispose();
const pits=(data.facilities?.pitLanes??[]).flatMap(l=>{const {geometry}=pitLaneModel(data,g,{...l,terrainMeshSpacingMetres:undefined});const result=triangles(geometry);geometry.dispose();return result});
let minEyeAboveFloor=Infinity,minFloorAboveGround=Infinity,maxFloorMeshMismatch=0;
const groundSurface=rt.spectators.zoneSurfaces.get(source.zone.zoneId)![0];
const groundMesh=new Mesh(rt.spectators.surfaceGeometry(groundSurface),new MeshBasicMaterial({side:DoubleSide}));groundMesh.updateMatrixWorld(true);
for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
 const u=.001+.998*i/20,v=.001+.998*j/20,floor=rt.spectators.zonePoint(source.zone.zoneId,u,v,false),eye=rt.spectators.zonePoint(source.zone.zoneId,u,v);
 minEyeAboveFloor=Math.min(minEyeAboveFloor,eye.y-floor.y);minFloorAboveGround=Math.min(minFloorAboveGround,floor.y-g.groundAt(floor.x,floor.z));
 const hit=new Raycaster(eye,new Vector3(0,-1,0),0,2).intersectObject(groundMesh)[0];if(!hit)throw Error('Seated eye has no native stand mesh');maxFloorMeshMismatch=Math.max(maxFloorMeshMismatch,Math.abs(hit.distance-1.2));
}
groundMesh.geometry.dispose();(groundMesh.material as MeshBasicMaterial).dispose();
const result={roads,pits,buildings:(data.facilities?.buildings??[]).map(b=>b.boundary.map(xy)),
 zones:data.spectatorZones.filter(z=>z.availability==='available').map(z=>({id:z.zoneId,boundary:z.boundary.map(xy)})),
 barriers:data.barriers.barriers.map(b=>({id:b.id,kind:b.kind,widthMetres:b.widthMetres,coordinates:b.coordinates.map(xy)})),
 samples:441,minEyeAboveFloor,minFloorAboveGround,maxFloorMeshMismatch};
mkdirSync('artifacts/goal-review/silverstone-vale',{recursive:true});
writeFileSync('artifacts/goal-review/silverstone-vale/geometry.json',JSON.stringify(result));
console.log(JSON.stringify({samples:result.samples,minEyeAboveFloor,minFloorAboveGround}));
