import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {cockpitAt} from '../src/systems/VehicleDynamics';
it('retains the actual rear support wall that blocks T6 ground at the central pass',async()=>{
 const r=createCircuitContext(await loadCircuit('montreal')),m=r.spectators;
 const ground=m.zoneSurfaces.get('ga-t6-family')![0],stand=m.zoneSurfaces.get('grandstand-33')![0];
 const eye=m.surfacePoint(ground,.5,.5,true),floor=m.surfacePoint(ground,.5,.5);
 expect(eye.y-floor.y).toBeCloseTo(1.65,8);
 const mat=new MeshBasicMaterial({side:DoubleSide}),geometry=m.surfaceGeometry(stand,p=>r.geometry.groundAt(p.x,p.y)-.15),mesh=new Mesh(geometry,mat);mesh.updateMatrixWorld(true);
 try{
  const center=m.zonePassCenter('ga-t6-family');
  const target=cockpitAt(center,r.geometry),delta=target.clone().sub(eye),distance=delta.length();
  expect(new Raycaster(eye,delta.normalize(),.001,distance-.001).intersectObject(mesh).length).toBeGreaterThan(0);
  const later=cockpitAt(center+140,r.geometry),lateDelta=later.clone().sub(eye),lateDistance=lateDelta.length();
  expect(new Raycaster(eye,lateDelta.normalize(),.001,lateDistance-.001).intersectObject(mesh)).toHaveLength(0);
 }finally{geometry.dispose();mat.dispose()}
});
