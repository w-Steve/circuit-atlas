import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/europe/monaco-standing-world.json';
import width from '../src/circuits/europe/monaco-width-reference.json';

it('replaces the generic14m width with the documented10m reference without changing the racing centerline',async()=>{
 const d=await loadCircuit('monaco');
 expect(d.trackGeometry.widthMetres).toBe(10);expect(d.trackGeometry.widthSource).toEqual(width.source);
 expect(width.previousWidthMetres).toBe(14);expect(source.roadWidthMetres).toBe(10);
 expect(source.issues).toEqual([]);expect(source.roadClearanceMetres).toBeGreaterThan(1);
 expect(source.unregisteredProducts).toEqual(['Secteur Rocher']);
 expect(d.spectatorZones.find(z=>z.zoneId==='z-quai-kennedy')!.surfaces![0].rows).toBe(0);
 expect(source.previousZone.surfaces[0].rows).toBe(11);
});

it('keeps standing eyes and the rendered Z ground on the same regional terrain',async()=>{
 const d=structuredClone(await loadCircuit('monaco')),z=d.spectatorZones.find(z=>z.zoneId==='z-quai-kennedy')!;z.availability='available';
 const r=createCircuitContext(d),surface=r.spectators.zoneSurfaces.get(z.zoneId)![0],material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(r.spectators.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
 for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
  const p={zoneId:z.zoneId,tier:'lower' as const,u,v},eye=r.observer(p),floor=r.observerFloor(p);
  expect(eye.y-floor.y).toBeCloseTo(1.65,7);
  const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
  expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
 }
 mesh.geometry.dispose();material.dispose();
});

it('uses the organizer-named Kennedy branch without moving eyes or changing unsourced ground defaults',async()=>{
 const d=structuredClone(await loadCircuit('monaco')),z=d.spectatorZones.find(z=>z.zoneId==='z-quai-kennedy')!;z.availability='available';
 expect(z.surfaces![0].viewRoadReference!.source.url).toBe('https://www.openstreetmap.org/way/699218006');
 const old=structuredClone(d);delete old.spectatorZones.find(z=>z.zoneId=== 'z-quai-kennedy')!.surfaces![0].viewRoadReference;
 const current=createCircuitContext(d),previous=createCircuitContext(old);
 for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
  const pick={zoneId:z.zoneId,tier:'lower' as const,u,v};
  expect(current.observer(pick).toArray()).toEqual(previous.observer(pick).toArray());
  const nearest=previous.spectators.nearestTrack(previous.observer(pick)).point.add(new Vector3(0,.9,0));
  expect(previous.lookTarget(pick).distanceTo(nearest)).toBeLessThan(1e-6);
 }
 const center={zoneId:z.zoneId,tier:'lower' as const,u:.5,v:.5};
 expect(current.lookTarget(center).y).toBeLessThan(previous.lookTarget(center).y-5);
 expect(Math.abs(current.spectators.nearestTrack(current.lookTarget(center)).distance-previous.spectators.nearestTrack(previous.lookTarget(center)).distance)).toBeGreaterThan(500);
});
