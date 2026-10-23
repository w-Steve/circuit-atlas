import {expect,it,afterEach} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {asiaPacificCircuits} from '../src/circuits/regions';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {circuitRuntime} from '../src/circuits/runtime';
import {observer,lookTarget} from '../src/systems/GrandstandGeometry';
import {useApp} from '../src/store';
afterEach(()=>{circuitRuntime.current=null;useApp.getState().activateCircuit('shanghai')});
for(const id of asiaPacificCircuits.filter(id=>id!=='shanghai'))it(`${id}: B-group seats use continuous metric surfaces, real observer/camera and honest availability`,async()=>{
 const data=await loadCircuit(id),g=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation),model=createSpectators(data.spectatorZones,g);
 expect(data.simulationAvailability).toBe('available');expect(model.spectatorZones.length).toBeGreaterThan(1);
 expect(circuitRegistry.find(c=>c.circuitId===id)?.spectatorZoneIds).toEqual(model.spectatorZones.map(z=>z.zoneId));
 circuitRuntime.current={data,geometry:g,spectators:model};
 for(const zone of data.spectatorZones){
  expect(zone.openingSource?.url).toMatch(/^https:/);expect(zone.surfaceSource?.confidence).toBe('low');
  if(zone.availability!=='available'){
   expect(zone.geometryReview?.issues.length).toBeGreaterThan(0);expect(model.zoneById(zone.zoneId)).toBeUndefined();continue;
  }
  for(const surface of model.zoneSurfaces.get(zone.zoneId)!){
   const geometry=model.surfaceGeometry(surface,()=>0),material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(geometry,material);mesh.updateMatrixWorld(true);
   for(const u of [.04,.4,.95])for(const v of [.12,.53,.87]){
    const floor=model.surfacePoint(surface,u,v),selected=model.selectionAt(surface,floor),eye=observer(selected);
    expect(model.zonePoint(selected.zoneId,selected.u,selected.v,false).distanceTo(floor)).toBeLessThan(1e-6);
    expect(eye.y-floor.y).toBeCloseTo(1.2,6);
    const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
    expect(hit,surface.definition.surfaceId).toBeDefined();expect(eye.y-hit.point.y).toBeCloseTo(1.2,2);
    expect(lookTarget(selected).toArray().every(Number.isFinite)).toBe(true);
   }
   geometry.dispose();material.dispose();
  }
 }
});
