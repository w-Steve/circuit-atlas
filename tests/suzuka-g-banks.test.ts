import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector2,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {terrainHeight} from '../src/circuits/elevation';
import source from '../src/circuits/asia/suzuka-g-permanent.json';

it('two permanent G banks retain all original OSM strip vertices and the organizer numbered rows',async()=>{
 const d=await loadCircuit('suzuka'),r=createCircuitContext(d),z=d.spectatorZones.find(z=>z.zoneId==='g')!;
 expect(z.surfaces).toHaveLength(2);expect(z.surfaces!.map(s=>s.rows)).toEqual([10,9]);
 expect(source.scope).toContain('not a complete2026');
 for(const bank of source.banks){
  const s=r.spectators.zoneSurfaces.get('g')!.find(s=>s.definition.surfaceId===bank.surfaceId)!;
  const p=s.points,area=p.reduce((sum,a,i)=>sum+a.x*p[(i+1)%p.length].y-a.y*p[(i+1)%p.length].x,0);
  for(const original of source.originalZone.surfaces.filter(s=>bank.sourceSurfaceIds.includes(s.surfaceId)))for(const [lon,lat] of original.boundary){
   const q=new Vector2((lon-r.geometry.origin[0])*111320*Math.cos(r.geometry.origin[1]*Math.PI/180)*r.geometry.calibration,-(lat-r.geometry.origin[1])*111320*r.geometry.calibration);
   for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];expect(((b.x-a.x)*(q.y-a.y)-(b.y-a.y)*(q.x-a.x))*Math.sign(area)).toBeGreaterThanOrEqual(-1e-6)}
  }
  const ground=s.definition.groundReference!.coordinate;
  expect(s.definition.baseHeight).toBeCloseTo(terrainHeight(d.elevation,...ground)+.1,8);
  expect(s.definition.rise).toBeCloseTo(terrainHeight(d.elevation,...s.definition.terrainRiseReference!.coordinate)-terrainHeight(d.elevation,...ground),8);
  expect(s.definition.rowCountSource?.url).toBe(source.sourcePdf.url);
 }
});

it('permanent bank eyes agree with their actual step meshes across the full source envelopes',async()=>{
 const r=createCircuitContext(await loadCircuit('suzuka')),material=new MeshBasicMaterial({side:DoubleSide});
 for(const s of r.spectators.zoneSurfaces.get('g')!){
  const mesh=new Mesh(r.spectators.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  for(const u of [.01,.25,.5,.75,.99])for(const v of [.05,.25,.5,.75,.95]){
   const floor=r.spectators.surfacePoint(s,u,v),pick=r.spectators.selectionAt(s,floor),eye=r.observer(pick);
   expect(eye.y-floor.y).toBeCloseTo(1.2,7);
   const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
   expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
   expect(r.lookTarget(pick).toArray().every(Number.isFinite)).toBe(true);
  }
  mesh.geometry.dispose();
 }
 material.dispose();
});
