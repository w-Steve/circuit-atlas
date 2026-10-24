import {it,expect} from 'vitest';
import {Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {terrainSpectatorZones} from '../src/circuits/spectatorDatum';

it('Zandvoort GA1 and GA2 are source-ground areas, not copied stepped grandstands',async()=>{
 const data=await loadCircuit('zandvoort'),snapshot=JSON.stringify(data),g=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
 const model=createSpectators(terrainSpectatorZones(data),g);
 for(const id of ['ga1','ga2']){
  const z=model.zoneById(id)!;expect(z.kind).toBe('general-admission');expect(z.availability).toBe('available');
  expect(()=>createSpectators([{...z,surfaces:[{...z.surfaces![0],rows:2}]}],g)).toThrow(/unseated geometry/);
  expect(z.openingSource?.url).toContain('2026_F1_Netherlands');expect(z.openingSource?.method).toBe('published');
  let min=Infinity,max=-Infinity;
  for(const surface of model.zoneSurfaces.get(id)!){
   expect(surface.definition.rows).toBe(0);expect(surface.definition.terrainFollow).toBe(true);expect(surface.definition.baseHeight).toBe(.04);
   const mesh=model.surfaceGeometry(surface),p=mesh.getAttribute('position');
   for(let i=0;i<p.count;i++){
    expect(p.getY(i)).toBeCloseTo(g.groundAt(p.getX(i),p.getZ(i))+.04,4);
    min=Math.min(min,p.getY(i));max=Math.max(max,p.getY(i));
    const j=i-i%3+(i+1)%3;expect(Math.hypot(p.getX(i)-p.getX(j),p.getZ(i)-p.getZ(j))).toBeLessThanOrEqual(8.001);
   }
   for(const u of [.01,.1,.3,.5,.7,.9,.99])for(const v of [.01,.25,.5,.75,.99]){
    const floor=model.surfacePoint(surface,u,v),selection=model.selectionAt(surface,floor),eye=model.zonePoint(id,selection.u,selection.v);
    expect(Math.abs(floor.y-g.groundAt(floor.x,floor.z)-.04)).toBeLessThan(.2);
    expect(eye.distanceTo(floor.clone().add(new Vector3(0,1.2,0)))).toBeLessThan(.001);
    expect(model.facingTarget(id,selection.u,selection.v).distanceTo(model.nearestTrack(eye).point)).toBeLessThan(.001);
   }mesh.dispose();
  }
  expect(max-min,'Public ground must retain actual regional slopes').toBeGreaterThan(1);
 }
 expect(JSON.stringify(data)).toBe(snapshot);
});
