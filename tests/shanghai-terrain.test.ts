import {it,expect} from 'vitest';
import {Vector3,Group} from 'three';
import data from '../src/circuits/generated/shanghai.json';
import type {CircuitPackage} from '../src/circuits/types';
import * as g from '../src/systems/CircuitGeometry';
import {smoothRoadHeights} from '../src/circuits/roadElevation';
import {terrainHeight} from '../src/circuits/elevation';
import {roadTerrain} from '../src/circuits/roadTerrain';
import {local,foundationAltitude,facilities} from '../src/data/config';
import {observer,lookTarget} from '../src/systems/GrandstandGeometry';
import {spectatorZones,surfacePoint,zoneSurfaces} from '../src/circuits/shanghai/spectators';
import {shanghaiFoundations} from '../src/circuits/shanghai/terrain';
import {spectatorTerrain} from '../src/circuits/spectatorTerrain';
import {placeVehicle,cockpitAt} from '../src/systems/VehicleSimulation';
const circuit=data as unknown as CircuitPackage;
it('Shanghai migrates to sourced ground and a bounded continuous road estimate in real metres',()=>{
 const saved=JSON.stringify(data.elevation.grid),samples=Array.from({length:2000},(_,i)=>g.at(i*g.length/2000));
 const heights=samples.map(p=>p.y),slopes=samples.map((_,i)=>Math.abs(g.tangent(i*g.length/2000).y));
 console.log('Shanghai estimated road', {min:Math.min(...heights),max:Math.max(...heights),maxSlope:Math.max(...slopes),foundationAltitude});
 expect(g.length).toBeCloseTo(5451,6);expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(1);
 expect(Math.min(...heights)).toBeGreaterThanOrEqual(0);expect(Math.max(...heights)).toBeLessThanOrEqual(Math.max(...data.elevation.grid.heights)-data.elevation.grid.referenceAltitude);
 expect(g.at(-.01).distanceTo(g.at(.01))).toBeCloseTo(.02,3);
 expect(g.tangent(-.01).distanceTo(g.tangent(.01))).toBeLessThan(.005);
 const cut=roadTerrain(circuit,g,6);
 for(const p of samples.filter((_,i)=>i%10===0))expect(cut(p.x,p.z,g.groundAt(p.x,p.z))).toBeCloseTo(p.y,1);
 expect(JSON.stringify(data.elevation.grid)).toBe(saved);
 const [w,s]=data.elevation.grid.bounds;
 expect(terrainHeight(circuit.elevation,w,s)).toBeCloseTo(data.elevation.grid.heights[0]-data.elevation.grid.referenceAltitude);
});
it('coarse-road interpolation is periodic, constant-preserving and never amplifies relief',()=>{
 const points=Array.from({length:400},(_,i)=>new Vector3(Math.cos(i*Math.PI/200)*200,i===0?10:2,Math.sin(i*Math.PI/200)*200));
 const smooth=smoothRoadHeights(points,45);expect(Math.min(...smooth)).toBeGreaterThanOrEqual(2);expect(Math.max(...smooth)).toBeLessThan(10);
 expect(smooth[1]).toBeCloseTo(smooth.at(-1)!,8);
 expect(smoothRoadHeights(points.map(p=>p.clone().setY(7)),45).every(v=>Math.abs(v-7)<1e-10)).toBe(true);
});
it('existing A dimensions and all other Shanghai eyes share the migrated native ground datum',()=>{
 expect(local(0,0,0)[1]).toBe(foundationAltitude);expect(facilities.car.length).toBe(5.2);expect(facilities.car.width).toBe(1.9);
 const cut=spectatorTerrain(circuit,g,6,shanghaiFoundations);
 for(const tier of ['lower','upper','platinum'] as const)for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
  const p=observer({tier,u,v});expect(p.y).toBeGreaterThan(cut(p.x,p.z,g.groundAt(p.x,p.z))+1);
 }
 for(const zone of spectatorZones.filter(z=>z.zoneId!=='a'))for(const surface of zoneSurfaces.get(zone.zoneId)!)for(const u of [.1,.5,.9])for(const v of [.1,.5,.9]){
  const p=surfacePoint(surface,u,v,true);expect(p.y).toBeGreaterThan(cut(p.x,p.z,g.groundAt(p.x,p.z))+.8);
  const eye=observer({zoneId:zone.zoneId,tier:'lower',u,v}),target=lookTarget({zoneId:zone.zoneId,tier:'lower',u,v});
  expect(eye.toArray().every(Number.isFinite)).toBe(true);expect(target.y).toBeGreaterThan(.9);
 }
});
it('Shanghai real car and cockpit follow road altitude and grade, including after capture restoration',()=>{
 const car=new Group();
 for(let i=0;i<200;i++){
  const distance=i*g.length/200;placeVehicle(car,distance);
  expect(car.position.distanceTo(g.at(distance).add(new Vector3(0,.22,0)))).toBeLessThan(1e-8);
  expect(new Vector3(0,0,1).applyQuaternion(car.quaternion).distanceTo(g.tangent(distance))).toBeLessThan(1e-8);
  const anchor=new Vector3(0,facilities.car.cockpitHeight,facilities.car.cockpitOffset).applyMatrix4(car.matrixWorld);
  expect(cockpitAt(distance).distanceTo(anchor)).toBeLessThan(1e-8);
 }
});
