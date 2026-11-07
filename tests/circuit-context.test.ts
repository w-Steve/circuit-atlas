import {it,expect} from 'vitest';
import {Group,PerspectiveCamera,Vector3} from 'three';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {CircuitContextCache} from '../src/app/CircuitContextCache';
import {observer as originalObserver,lookTarget as originalTarget} from '../src/systems/GrandstandGeometry';
import {freezeMoment,exposureQuaternion,sampleDistance,withVehicleSample} from '../src/camera/Exposure';
import {timingDetailVisible} from '../src/camera/mapDetail';

it('Shanghai keeps the original lower, upper and platinum metric eyes in the shared engine',async()=>{
 const r=createCircuitContext(await loadCircuit('shanghai'));
 expect(r.data.scene?.wireMeshes).toHaveLength(1);expect(r.data.scene?.landmarks?.[0].role).toBe('pit');
 for(const tier of ['lower','upper','platinum'] as const)for(const u of [.1,.5,.9])for(const v of [0,.5,1]){
  const selection={zoneId:'a',tier,u,v},p=r.observer(selection);
  expect(p.distanceTo(originalObserver(selection)),`${tier} ${u}/${v}`).toBeLessThan(1e-6);
  expect(r.lookTarget(selection).distanceTo(originalTarget(selection))).toBeLessThan(1e-6);
  r.store.getState().select(selection);
  const surface=r.selectedSurface(selection)!;
  const pick=r.selectAt(surface,p.clone().add(new Vector3(0,-1.2,0)));
  expect(pick.tier).toBe(tier);expect(pick.u).toBeCloseTo(u,7);expect(pick.v).toBeCloseTo(v,7);
 }
});
it('independent simultaneous circuit contexts cannot redirect a frozen photo or mutate each other',async()=>{
 const a=createCircuitContext(await loadCircuit('spa')),b=createCircuitContext(await loadCircuit('suzuka'));
 const zone=a.spectators.spectatorZones[0].zoneId,selection={zoneId:zone,tier:'lower' as const,u:.4,v:.8};
 const camera=new PerspectiveCamera(15,4/3,.1,20000);camera.position.copy(a.observer(selection));camera.lookAt(a.cockpitAt(a.simulation.distance));camera.updateMatrixWorld(true);
 a.simulation.play();const moment=freezeMoment(a.simulation,camera,60,'tracking',a),car=new Group();a.placeVehicle(car,a.simulation.distance);
 const position=car.position.clone(),rotation=car.quaternion.clone(),before=JSON.stringify(a.store.getState());
 b.store.getState().setZoom(30);b.store.getState().look(.7,.3);b.simulation.play();b.simulation.advance(1);b.shutter.busy=true;b.camera.current=new PerspectiveCamera();
 expect(a.shutter.busy).toBe(false);expect(a.camera.current).toBeNull();expect(JSON.stringify(a.store.getState())).toBe(before);
 for(const time of [-1/120,1/120]){
  const frame=camera.clone();frame.quaternion.copy(exposureQuaternion(moment,time));frame.updateMatrixWorld(true);
  const p=moment.cockpitAt(sampleDistance(moment,time)).project(frame);expect(Math.hypot(p.x,p.y)).toBeLessThan(1e-8);
  withVehicleSample(car,sampleDistance(moment,time),()=>expect(car.position.distanceTo(a.geometry.at(sampleDistance(moment,time)).add(new Vector3(0,.22,0)))).toBeLessThan(1e-8),moment.placeVehicle);
 }
 expect(car.position.distanceTo(position)).toBe(0);expect(car.quaternion.angleTo(rotation)).toBeLessThan(1e-7);
 expect(a.simulation.elapsedSeconds).toBe(0);expect(b.simulation.elapsedSeconds).toBeCloseTo(1,10);
});
it('bounded model cache evicts geometry but restores selection, photo parameters, pass and map view',async()=>{
 const cache=new CircuitContextCache(1),a=createCircuitContext(await loadCircuit('shanghai'));
 a.store.getState().chooseZone('c');a.store.getState().select({zoneId:'c',tier:'lower',u:.42,v:.25});a.store.getState().chooseZone('b');
 a.store.getState().select({zoneId:'b',tier:'lower',u:.21,v:.83});a.store.getState().setZoom(17);a.store.getState().setShutterSpeed(125);
 a.simulation.play();a.simulation.advance(.4);a.views.set('map',{position:[1,2,3],target:[4,5,6],visit:2});cache.set('shanghai',a);
 cache.set('suzuka',createCircuitContext(await loadCircuit('suzuka')));expect(cache.size).toBe(1);expect(cache.get('shanghai')).toBeUndefined();
 const next=createCircuitContext(await loadCircuit('shanghai'));cache.set('shanghai',next);
 expect(next.store.getState().selection).toEqual(a.store.getState().selection);expect(next.store.getState().zoom).toBe(17);expect(next.store.getState().shutterSpeed).toBe(125);
 expect(next.simulation.distance).toBe(a.simulation.distance);expect(next.simulation.status).toBe('paused');expect(next.views.get('map')).toEqual(a.views.get('map'));
 next.store.getState().chooseZone('c');expect(next.store.getState().selection).toEqual({zoneId:'c',tier:'lower',u:.42,v:.25});
 next.store.getState().setZoom(2);expect(next.store.getState().zoom).toBe(2);expect(a.store.getState().zoom).toBe(17);
});
it('secondary timing details disappear at distant scales across desktop, tablet and mobile',()=>{
 for(const height of [960,768,664]){
  const camera=new PerspectiveCamera(50,1,1,60000),target=new Vector3();
  camera.position.set(0,height*2,0);expect(timingDetailVisible(camera,target,height)).toBe(true);
  camera.position.set(0,height*5,0);expect(timingDetailVisible(camera,target,height)).toBe(false);
 }
});
for(const {circuitId} of circuitRegistry)it(`${circuitId} instantiates through one context factory with independent real-metre motion`,async()=>{
 const r=createCircuitContext(await loadCircuit(circuitId)),selection=r.store.getState().selection;
 expect(r.store.getState().circuitId).toBe(circuitId);expect(r.observer(selection).toArray().every(Number.isFinite)).toBe(true);
 const car=new Group();r.placeVehicle(car,100);expect(car.position.distanceTo(r.geometry.at(100).add(new Vector3(0,.22,0)))).toBeLessThan(1e-8);
 const before=r.simulation.distance;r.simulation.play();r.simulation.advance(.25);expect(r.simulation.distance-before).toBeCloseTo(200/3.6*.25,8);
});
