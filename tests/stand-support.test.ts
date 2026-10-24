import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {terrainHeight} from '../src/circuits/elevation';

it('Monaco L support walls follow the actual treads and cannot cut across the default sightline',async()=>{
 const d=await loadCircuit('monaco'),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation);
 const zones=d.spectatorZones.filter(z=>z.availability==='available').map(z=>({...z,surfaces:z.surfaces?.map(s=>{
  const center=s.boundary.reduce((p,q)=>[p[0]+q[0]/s.boundary.length,p[1]+q[1]/s.boundary.length],[0,0]);
  return {...s,baseHeight:s.baseHeight+terrainHeight(d.elevation,center[0],center[1])};
 })}));
 const m=createSpectators(zones,g),surface=m.zoneSurfaces.get('l-piscine')![0];
 const mesh=new Mesh(m.surfaceGeometry(surface,p=>terrainHeight(d.elevation,
  g.origin[0]+p.x/(111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration),g.origin[1]-p.y/(111320*g.calibration))-.15),new MeshBasicMaterial({side:DoubleSide}));
 mesh.updateMatrixWorld(true);
 const eye=m.zonePoint('l-piscine',.5,.5),target=m.facingTarget('l-piscine',.5,.5);
 const ray=new Raycaster(eye,target.clone().sub(eye).normalize(),.1,eye.distanceTo(target));
 expect(ray.intersectObject(mesh),'support wall must not block the track').toHaveLength(0);
 const down=new Raycaster(eye.clone().add(new Vector3(0,50,0)),new Vector3(0,-1,0));
 expect(eye.y-down.intersectObject(mesh)[0].point.y).toBeCloseTo(1.2,3);
 mesh.geometry.dispose();mesh.material.dispose();
});
