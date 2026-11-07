import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {spectatorCanopy} from '../src/circuits/spectatorCanopy';

it('covers only the upper T4 bank, keeps seated height, and retains physical columns',async()=>{
 const r=createCircuitContext(await loadCircuit('austin')),m=r.spectators,s=m.zoneSurfaces.get('turn-4')![0];
 const canopy=spectatorCanopy(s,m)!,material=new MeshBasicMaterial({side:DoubleSide}),roof=new Mesh(canopy.roof,material),posts=new Mesh(canopy.posts,material);
 roof.updateMatrixWorld(true);posts.updateMatrixWorld(true);
 try{
  for(const u of [.1,.3,.5,.7,.9])for(const v of [.1,.3,.7,.9]){
   const eye=m.surfacePoint(s,u,v,true),floor=m.surfacePoint(s,u,v,false);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);
   const hits=new Raycaster(eye,new Vector3(0,1,0),0,30).intersectObject(roof);
   expect(hits.length>0).toBe(v>.5);
   if(v>.5)expect(hits[0].distance).toBeGreaterThan(1);
  }
  // A column genuinely intercepts a horizontal ray; it is not a decorative overlay.
  const a=posts.geometry.getAttribute('position'),p=new Vector3(a.getX(0),a.getY(0),a.getZ(0));
  const hit=new Raycaster(p.clone().add(new Vector3(-2,0,0)),new Vector3(1,0,0),0,4).intersectObject(posts);
  expect(hit.length).toBeGreaterThan(0);
 }finally{canopy.roof.dispose();canopy.posts.dispose();material.dispose()}
});
