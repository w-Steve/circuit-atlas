/** Local 3D audit, independent of road-footprint and UI checks.
 * A flagged line is evidence for review, not permission to move real obstacles.
 * Excludes fence wires (expected occluders), spectators and the moving car.
 * Run: node node_modules/vite-node/vite-node.mjs scripts/audit-spectator-sightlines.ts
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {terrainHeight} from '../src/circuits/elevation';
import {buildingModel} from '../src/circuits/facilityGeometry';
import {terrainSpectatorZones} from '../src/circuits/spectatorDatum';

const report:any[]=[];
const selected=process.argv.slice(2);
if(selected.some(id=>!circuitRegistry.some(c=>c.circuitId===id)||id==='shanghai'))throw new Error('Pass shared circuit IDs, or no arguments for the full shared-circuit audit.');
for(const {circuitId:id} of circuitRegistry.filter(c=>c.circuitId!=='shanghai'&&(!selected.length||selected.includes(c.circuitId)))){
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
 // A zone-wide u grid misses entire banks in a multi-surface area. Sample each
 // physical surface separately and keep a lower vehicle-body reference as well:
 // seeing a cockpit/roof does not prove the lower body is above the front edge.
 // These are diagnostic points, not a full silhouette or a seat-view guarantee.
 const surfaceHits:any[]=[];let surfaceChecked=0;
 for(const surfaces of model.zoneSurfaces.values())for(const surface of surfaces)for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
  const floor=model.surfacePoint(surface,u,v),pick=model.selectionAt(surface,floor),eye=model.zonePoint(pick.zoneId,pick.u,pick.v);
  const road=model.facingTarget(pick.zoneId,pick.u,pick.v);
  for(const height of [.9,.4]){
   const target=road.clone().add(new Vector3(0,height,0)),distance=eye.distanceTo(target);
   const hit=new Raycaster(eye,target.clone().sub(eye).normalize(),.05,distance-.05).intersectObjects(meshes)[0];
   if(hit)surfaceHits.push({zoneId:pick.zoneId,surfaceId:surface.definition.surfaceId,localU:u,v,targetHeightMetres:height,eye:eye.toArray(),target:target.toArray(),obstacle:hit.object.name,distance:hit.distance});
  }
  surfaceChecked++;
 }
 const runtimeInputSha256=createHash('sha256').update(JSON.stringify({trackGeometry:d.trackGeometry,lengthMetres:d.lengthMetres,elevation:d.elevation,spectatorZones:zones,facilities:d.facilities})).digest('hex');
 report.push({circuitId:id,runtimeInputSha256,checked,blockedCount:hits.length,hits,surfaceAudit:{checkedViewpoints:surfaceChecked,checkedRays:surfaceChecked*2,blockedRays:surfaceHits.length,hits:surfaceHits}});
 meshes.forEach(m=>m.geometry.dispose());material.dispose();
 console.log(`${id}: ${hits.length}/${checked} zone rays; ${surfaceHits.length}/${surfaceChecked*2} per-surface high/low body diagnostic rays need review`);
}
mkdirSync('artifacts/goal-review',{recursive:true});
writeFileSync(`artifacts/goal-review/spectator-sightlines${selected.length?'-'+selected.join('-'):''}.json`,JSON.stringify({circuitIds:report.map(r=>r.circuitId),eyeHeightRule:{grandstands:'authored seated height',publicGroundMetres:1.65},checkedAt:new Date().toISOString().slice(0,10),
 scope:'Selected shared circuits. Original 9 samples per available zone retained for comparison; additional 9 samples per physical surface with0.9m upper/0.4m lower body road-relative reference points. The0.4m point approximates the model floor/body level (base0.22m+floor0.16m), not a full silhouette. Stand meshes and pit buildings only; fence wires, people and separate terrain outside spectator patches are not covered. Flags require source/physical review, never automatic obstacle removal or camera/height optimization.',circuits:report},null,2));
