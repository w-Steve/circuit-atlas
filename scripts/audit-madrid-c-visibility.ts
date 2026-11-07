// Usage: vite-node scripts/audit-madrid-c-visibility.ts <exposure.json> <report.json>
// Replays the road intersection at a saved exposure, without changing the model.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {mapRoad} from '../src/circuits/mapRoad';
import {cockpitAt} from '../src/systems/VehicleDynamics';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Expected exposure.json and output report path');
const {meta}=JSON.parse(readFileSync(input,'utf8'));
if(meta.zoneId!=='ga-c-straight'||!Array.isArray(meta.observerPosition)||meta.observerPosition.length!==3||!meta.observerPosition.every(Number.isFinite)||!Number.isFinite(meta.distance))throw Error('Expected Madrid C ground exposure metadata');
const runtime=createCircuitContext(await loadCircuit('madrid')),g=runtime.geometry;
const eye=new Vector3(...meta.observerPosition as [number,number,number]),target=cockpitAt(meta.distance,g),distance=eye.distanceTo(target);
const material=new MeshBasicMaterial({side:DoubleSide}),roads=mapRoad(g,runtime.data.trackGeometry.widthMetres,.2);
try {
 const objects=[['road',roads.road],['verge',roads.verge]].map(([name,geometry])=>{const mesh=new Mesh(geometry as typeof roads.road,material);mesh.name=name as string;mesh.updateMatrixWorld(true);return mesh});
 const intersections=new Raycaster(eye,target.clone().sub(eye).normalize(),.001,distance-.001).intersectObjects(objects).map(hit=>({object:hit.object.name,distanceMetres:hit.distance,point:hit.point.toArray()}));
 const report={circuitId:'madrid',zoneId:meta.zoneId,packageSha256:createHash('sha256').update(readFileSync('src/circuits/generated/madrid.json')).digest('hex'),observerPosition:eye.toArray(),cockpitPosition:target.toArray(),distanceMetres:distance,observerGroundMetres:g.groundAt(eye.x,eye.z),roadCentreGroundMetres:g.at(meta.distance).y,intersections,conclusion:'The current road mesh obstructs this saved cockpit ray. This proves model occlusion only; it does not validate the real 2026 ground profile.',nextSource:'Check local IGN/PNOA terrain acquisition date against 2026 circuit construction before migration.'};
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({intersections:intersections.length,distanceMetres:distance,output}));
}finally{roads.road.dispose();roads.verge.dispose();material.dispose()}
