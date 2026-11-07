import {expect,it,afterEach} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {americanCircuits} from '../src/circuits/regions';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {createCircuitContext} from '../src/app/CircuitContext';

import {createAppStore} from '../src/store';
const useApp=createAppStore();

for(const id of americanCircuits)it(`${id}: C-group seats use continuous metric surfaces, real observer/camera and honest availability`,async()=>{
 const data=await loadCircuit(id),runtime=createCircuitContext(data),g=runtime.geometry,model=runtime.spectators,{observer,lookTarget}=runtime;
 expect(data.simulationAvailability).toBe('available');expect(model.spectatorZones.length).toBeGreaterThan(1);
 expect(circuitRegistry.find(c=>c.circuitId===id)?.spectatorZoneIds).toEqual(model.spectatorZones.map(z=>z.zoneId));

 for(const zone of data.spectatorZones){
  expect(zone.openingSource?.url).toMatch(/^https:/);expect(zone.surfaceSource?.confidence).toBe('low');
  if(id==='mexico'&&['grada-14-sur','grada-15-norte'].includes(zone.zoneId))expect(zone.surfaces).toHaveLength(2);
  if(zone.availability!=='available'){
   expect(zone.geometryReview?.issues.length).toBeGreaterThan(0);expect(model.zoneById(zone.zoneId)).toBeUndefined();continue;
  }
  for(const surface of model.zoneSurfaces.get(zone.zoneId)!){
   const geometry=model.surfaceGeometry(surface,()=>0),material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(geometry,material);mesh.updateMatrixWorld(true);
   for(const u of [.04,.4,.95])for(const v of [.12,.53,.87]){
    const floor=model.surfacePoint(surface,u,v),raw=model.selectionAt(surface,floor),selected=runtime.selectAt(surface,floor),eye=observer(selected);
    expect(model.zonePoint(raw.zoneId,raw.u,raw.v,false).distanceTo(floor)).toBeLessThan(1e-6);
    expect(eye.distanceTo(model.surfacePoint(surface,u,v,true))).toBeLessThan(1e-6);
    expect(eye.y-floor.y).toBeCloseTo(zone.kind==='grandstand'?1.2:1.65,6);
    const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
    expect(hit,surface.definition.surfaceId).toBeDefined();expect(eye.y-hit.point.y).toBeCloseTo(zone.kind==='grandstand'?1.2:1.65,2);
    expect(lookTarget(selected).toArray().every(Number.isFinite)).toBe(true);
   }
   geometry.dispose();material.dispose();
  }
 }
});

it('Mexico rejects the misidentified infield6B surface instead of exposing a false ticket viewpoint',async()=>{
 const data=await loadCircuit('mexico'),runtime=createCircuitContext(data);
 const old=data.spectatorZones.find(z=>z.zoneId==='grada-6b')!;
 expect(old.availability).toBe('available');
 expect(old.source.url).toBe('https://www.openstreetmap.org/way/999257666');
 expect(runtime.spectators.zoneById('grada-6b')).toBeDefined();
 expect(circuitRegistry.find(c=>c.circuitId==='mexico')!.spectatorZoneIds).toContain('grada-6b');
 expect(runtime.spectators.zoneById('grada-6')).toBeDefined();
});
