/** Local 3D audit, independent of road-footprint and UI checks.
 * A flagged line is evidence for review, not permission to move real obstacles.
 * Excludes fence wires (expected occluders), spectators and the moving car.
 * Run: node node_modules/vite-node/vite-node.mjs scripts/audit-spectator-sightlines.ts
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {terrainHeight} from '../src/circuits/elevation';
import {buildingModel} from '../src/circuits/facilityGeometry';
import {terrainSpectatorZones} from '../src/circuits/spectatorDatum';

const report:any[]=[];
for(const {circuitId:id} of circuitRegistry.filter(c=>c.circuitId!=='shanghai')){
 const d=await loadCircuit(id),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation);
 const zones=terrainSpectatorZones(d);
 const model=createSpectators(zones,g),material=new MeshBasicMaterial({side:DoubleSide}),meshes:Mesh[]=[];
 for(const surfaces of model.zoneSurfaces.values())for(const s of surfaces){
  const base=s.zone.kind==='grandstand'&&s.zone.supportToTerrain!==false?(p:{x:number;y:number})=>terrainHeight(d.elevation,
   g.origin[0]+p.x/(111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration),g.origin[1]-p.y/(111320*g.calibration))-.15:undefined;
  const mesh=new Mesh(model.surfaceGeometry(s,base),material);mesh.name=`stand:${s.zone.zoneId}:${s.definition.surfaceId}`;mesh.updateMatrixWorld(true);meshes.push(mesh);
 }
 for(const b of d.facilities?.buildings??[]){const m=buildingModel(d,g,b);for(const geometry of [m.roof,m.walls]){
  const mesh=new Mesh(geometry,material);mesh.name=`building:${b.id}`;mesh.updateMatrixWorld(true);meshes.push(mesh);
 }}
 const hits:any[]=[];let checked=0;
 for(const z of zones)for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
  const eye=model.zonePoint(z.zoneId,u,v),target=model.facingTarget(z.zoneId,u,v).add(new Vector3(0,.9,0));
  const distance=eye.distanceTo(target),ray=new Raycaster(eye,target.clone().sub(eye).normalize(),.05,distance-.05);
  checked++;const hit=ray.intersectObjects(meshes)[0];
  if(hit)hits.push({zoneId:z.zoneId,u,v,eye:eye.toArray(),target:target.toArray(),obstacle:hit.object.name,distance:hit.distance});
 }
 report.push({circuitId:id,checked,blockedCount:hits.length,hits});
 meshes.forEach(m=>m.geometry.dispose());material.dispose();
 console.log(`${id}: ${hits.length}/${checked} sightlines need review`);
}
mkdirSync('artifacts/goal-review',{recursive:true});
writeFileSync('artifacts/goal-review/spectator-sightlines.json',JSON.stringify({checkedAt:'2026-10-24',
 scope:'22 shared circuits; 9 continuous selection samples per available zone; stand meshes and pit building geometry. Flags require source/physical review, not automatic removal of real obstacles.',circuits:report},null,2));
