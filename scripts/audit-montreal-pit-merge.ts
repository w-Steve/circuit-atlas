// Reproduce the two raised pit-exit surfaces found in exported scene photos.
// Uses the actual shared render meshes, not source-polyline distance alone.
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {mapRoad} from '../src/circuits/mapRoad';
import {pitLaneModel} from '../src/circuits/facilityGeometry';
import {createPitRoadJoin} from '../src/circuits/pitRoadJoin';

const data=await loadCircuit('montreal');
const g=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
const material=new MeshBasicMaterial({side:DoubleSide});
const road=mapRoad(g,data.trackGeometry.widthMetres,.2);
const mesh=(geometry:typeof road.road)=>{const m=new Mesh(geometry,material);m.updateMatrixWorld(true);return m};
const roadMesh=mesh(road.road);
const join=createPitRoadJoin(road.road,road.verge);
const lanes=(data.facilities?.pitLanes??[]).filter(l=>!l.underground).map(l=>{const raw=pitLaneModel(data,g,l).geometry,joined=join(raw);raw.dispose();return {id:l.id,mesh:mesh(joined)}});
const samples=[{zoneId:'grandstand-12',distance:551.7855555558851},{zoneId:'grandstand-11',distance:572.6144444437807}].map(sample=>{
 const p=g.at(sample.distance),ray=new Raycaster(p.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0));
 const surface=ray.intersectObject(roadMesh)[0];if(!surface)throw Error('Expected shared racing road at sample');
 const intersections=lanes.flatMap(l=>{const hit=ray.intersectObject(l.mesh)[0];return hit?[{laneId:l.id,heightAboveRacingSurfaceMetres:hit.point.y-surface.point.y}]:[]});
 return {...sample,position:p.toArray(),intersections};
});
const report={circuitId:data.circuitId,season:data.season,inputSha256:createHash('sha256').update(JSON.stringify({track:data.trackGeometry,elevation:data.elevation,facilities:data.facilities})).digest('hex'),samples,unresolved:samples.some(s=>s.intersections.some(i=>i.heightAboveRacingSurfaceMetres>.04)),limits:'Vertical center samples reproduce a mesh datum conflict; not an all-lane or all-seat acceptance.'};
mkdirSync('artifacts/goal-review',{recursive:true});writeFileSync('artifacts/goal-review/montreal-pit-merge.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({unresolved:report.unresolved,samples:samples.map(s=>({zoneId:s.zoneId,intersections:s.intersections}))}));
road.road.dispose();road.verge.dispose();lanes.forEach(l=>l.mesh.geometry.dispose());material.dispose();
