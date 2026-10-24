import {it,expect} from 'vitest';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {terrainSpectatorZones} from '../src/circuits/spectatorDatum';
import {terrainHeight} from '../src/circuits/elevation';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {deckRailing} from '../src/circuits/deckRailing';

it('Hungaroring reviewed seating counts replace footprint-derived rows without moving ground or footprints',async()=>{
 const d=await loadCircuit('hungaroring'),zones=terrainSpectatorZones(d);
 for(const [id,rows] of [['grand-prix-2',16],['podium',16],['chicane-3',17],['t1',26],['grand-prix-1',29],['apex-2',33],['grid-1',25],['grid-2',29],['grid-3',25],['pit-exit-1',12],['pit-exit-2',13]] as const){
  const original=d.spectatorZones.find(z=>z.zoneId===id)!,source=original.surfaces![0];
  const surface=zones.find(z=>z.zoneId===id)!.surfaces![0];
  expect(source.rows).toBe(rows);expect(source.rise).toBeCloseTo((rows-1)*.4,8);
  expect(source.rowCountSource?.confidence).toBe('medium');
  expect(source.rowCountSource?.url).toContain('oversteer48.com');
  expect(original.surfaceSource?.method).toBe('estimated');
  expect(source.baseHeight).toBe(2.2);expect(source.baseReference).toBeUndefined();
  expect(surface.boundary).toEqual(original.boundary);expect(surface.eyeHeight).toBe(1.2);
 }
});

it('a structural datum preserves every unrelated stand and does not mutate source data',async()=>{
 for(const c of circuitRegistry.filter(c=>c.circuitId!=='shanghai')){
  const data=await loadCircuit(c.circuitId),snapshot=JSON.stringify(data),zones=terrainSpectatorZones(data);
  for(const z of zones)for(const s of z.surfaces??[]){
   const original=data.spectatorZones.find(q=>q.zoneId===z.zoneId)!.surfaces!.find(q=>q.surfaceId===s.surfaceId)!;
   if(s.terrainFollow){expect(s.baseHeight).toBe(original.baseHeight)}
   else if(!s.baseReference){
    const center=s.boundary.reduce((p,q)=>[p[0]+q[0]/s.boundary.length,p[1]+q[1]/s.boundary.length],[0,0]);
    const ground=s.groundReference?.coordinate??center;
    expect(s.baseHeight).toBeCloseTo(original.baseHeight+terrainHeight(data.elevation,ground[0],ground[1]),9);
   }
   expect(s.boundary).toEqual(original.boundary);expect(s.rise).toBe(original.rise);expect(s.eyeHeight).toBe(original.eyeHeight);
  }
  expect(JSON.stringify(data)).toBe(snapshot);
 }
});

it('Hungaroring ordinary seating is distinct from its roof and uses its own sourced front ground datum',async()=>{
 const d=await loadCircuit('hungaroring'),snapshot=JSON.stringify(d),zones=terrainSpectatorZones(d);
 const source=d.spectatorZones.find(z=>z.zoneId==='hungaroring')!,s=zones.find(z=>z.zoneId==='hungaroring')!.surfaces![0];
 expect(s.rows).toBe(17);expect(s.rise).toBeCloseTo(6.4,8);expect(source.surface.depth).toBeCloseTo(17*.85,8);
 expect(source.source.method).toBe('estimated');expect(source.source.confidence).toBe('low');
 expect(s.groundReference?.source.url).toContain('dvmgroup.com');
 const ground=s.groundReference!.coordinate;
 expect(s.baseHeight).toBeCloseTo(terrainHeight(d.elevation,...ground)+2.2,8);
 const g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),m=createSpectators(zones,g);
 const surface=m.zoneSurfaces.get('hungaroring')![0],mesh=new Mesh(m.surfaceGeometry(surface,p=>terrainHeight(d.elevation,g.origin[0]+p.x/(111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration),g.origin[1]-p.y/(111320*g.calibration))-.15),new MeshBasicMaterial({side:DoubleSide}));
 mesh.updateMatrixWorld(true);
 for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
  const eye=m.zonePoint('hungaroring',u,v),look=m.facingTarget('hungaroring',u,v).add(new Vector3(0,.9,0));
  expect(eye.y-m.zonePoint('hungaroring',u,v,false).y).toBeCloseTo(1.2,8);
  expect(new Raycaster(eye,look.clone().sub(eye).normalize(),.05,eye.distanceTo(look)-.05).intersectObject(mesh)).toHaveLength(0);
 }
 expect(JSON.stringify(d)).toBe(snapshot);mesh.geometry.dispose();mesh.material.dispose();
 const shifted=terrainSpectatorZones({...d,elevation:{...d.elevation,grid:{...d.elevation.grid!,heights:d.elevation.grid!.heights.map(h=>h+40)}}});
 expect(shifted.find(z=>z.zoneId==='hungaroring')!.surfaces![0].baseHeight-s.baseHeight).toBeCloseTo(40,8);
});

it('Suzuka upper tier uses the lower back floor and survives a change of terrain datum',async()=>{
 const d=await loadCircuit('suzuka');
 const inspect=(data:typeof d)=>{
  const zones=terrainSpectatorZones(data),lower=zones.find(z=>z.zoneId==='v1')!.surfaces![0],upper=zones.find(z=>z.zoneId==='v2')!.surfaces![0];
  expect(upper.baseHeight-lower.baseHeight-lower.rise).toBeCloseTo(2,8);
  return {zones,lower,upper};
 };
 const original=inspect(d),changed=inspect({...d,elevation:{...d.elevation,grid:{...d.elevation.grid!,heights:d.elevation.grid!.heights.map(h=>h+40)}}});
 expect(changed.upper.baseHeight-original.upper.baseHeight).toBeCloseTo(40,8);
 const g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),m=createSpectators(original.zones,g);
 const surface=m.zoneSurfaces.get('v1')![0],mesh=new Mesh(m.surfaceGeometry(surface),new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld(true);
 // Verify the source-defined tier relation actually corrects the known problem,
 // without solving for a height from a raycast or changing the eye-height rule.
 for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
  const eye=m.zonePoint('v2',u,v),floor=m.zonePoint('v2',u,v,false),target=m.facingTarget('v2',u,v).add(new Vector3(0,.9,0));
  expect(eye.y-floor.y).toBeCloseTo(1.2,7);
  expect(new Raycaster(eye,target.clone().sub(eye).normalize(),.05,eye.distanceTo(target)-.05).intersectObject(mesh)).toHaveLength(0);
 }
 mesh.geometry.dispose();mesh.material.dispose();
});

it('invalid or cyclic tier relationships fail explicitly instead of inventing a height',async()=>{
 const d=structuredClone(await loadCircuit('suzuka')),upper=d.spectatorZones.find(z=>z.zoneId==='v2')!.surfaces![0];
 upper.baseReference!.surfaceId='missing';expect(()=>terrainSpectatorZones(d)).toThrow('Missing spectator datum');
 upper.baseReference!.zoneId='v2';upper.baseReference!.surfaceId=upper.surfaceId;
 expect(()=>terrainSpectatorZones(d)).toThrow('Cyclic spectator datum');
});

it('Suzuka B and Q seating uses published row maxima and separately estimated risers',async()=>{
 const d=await loadCircuit('suzuka'),zones=terrainSpectatorZones(d),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),model=createSpectators(zones,g);
 for(const [id,rows] of [['b1',9],['b2',22],['q1',12],['q2',15]] as const){
  const source=d.spectatorZones.find(z=>z.zoneId===id)!;
  expect(source.surface.rise).toBe(source.surfaces![0].rise);
  for(const surface of source.surfaces!){
   expect(surface.rows).toBe(rows);expect(surface.rowCountSource?.url).toBe(`https://www.suzukacircuit.jp/eng/f1/ticket/images/seat/pdf/f1_${id}.pdf`);
   expect(surface.rowCountSource?.method).toBe('published');expect(surface.rowRiserMetres).toBe(.4);
   expect(surface.rise).toBeCloseTo((rows-1)*.4,8);expect(source.surfaceSource?.confidence).toBe('low');
  }
 }
 for(const [upperId,lowerId] of [['b2','b1'],['q2','q1']]){
  const lower=zones.find(z=>z.zoneId===lowerId)!.surfaces![0],upper=zones.find(z=>z.zoneId===upperId)!;
  upper.surfaces!.forEach(s=>expect(s.baseHeight-lower.baseHeight-lower.rise).toBeCloseTo(2,8));
  const meshes=model.zoneSurfaces.get(lowerId)!.map(s=>new Mesh(model.surfaceGeometry(s,p=>terrainHeight(d.elevation,g.origin[0]+p.x/(111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration),g.origin[1]-p.y/(111320*g.calibration))-.15),new MeshBasicMaterial({side:DoubleSide})));
  meshes.forEach(m=>m.updateMatrixWorld(true));
  for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
   const eye=model.zonePoint(upperId,u,v),floor=model.zonePoint(upperId,u,v,false),target=model.facingTarget(upperId,u,v).add(new Vector3(0,.9,0));
   expect(eye.y-floor.y).toBeCloseTo(1.2,7);
   expect(new Raycaster(eye,target.clone().sub(eye).normalize(),.05,eye.distanceTo(target)-.05).intersectObjects(meshes)).toHaveLength(0);
  }
  meshes.forEach(m=>{m.geometry.dispose();m.material.dispose()});
 }
});

it('B2 elevated safety rail remains at its deck and is a real geometric occluder',async()=>{
 const d=await loadCircuit('suzuka'),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),model=createSpectators(terrainSpectatorZones(d),g);
 const s=model.zoneSurfaces.get('b2')![0],geometry=deckRailing(s,model),material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(geometry,material);mesh.updateMatrixWorld(true);
 const front=model.surfacePoint(s,.5,0),normal=new Vector3(s.normal.x,0,s.normal.y).multiplyScalar(s.frontSign),height=s.definition.frontRailing!.heightMetres;
 expect(s.definition.frontRailing!.source.method).toBe('estimated');expect(s.definition.baseReference?.zoneId).toBe('b1');
 const origin=front.clone().addScaledVector(normal,3).add(new Vector3(0,height,0));
 expect(new Raycaster(origin,normal.clone().negate(),0,6).intersectObject(mesh).length).toBeGreaterThan(0);
 expect(new Raycaster(origin.clone().add(new Vector3(0,.25,0)),normal.clone().negate(),0,6).intersectObject(mesh)).toHaveLength(0);
 geometry.computeBoundingBox();expect(geometry.boundingBox!.min.y).toBeCloseTo(s.definition.baseHeight,3);expect(geometry.boundingBox!.max.y).toBeCloseTo(s.definition.baseHeight+height+.02,3);
 geometry.dispose();material.dispose();
});
