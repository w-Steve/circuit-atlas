import {describe,it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import type {SpectatorZone} from '../src/circuits/types';
import {roadTerrain} from '../src/circuits/roadTerrain';
import {terrainHeight} from '../src/circuits/elevation';
import {buildingModel,buildingReference,pitLaneModel} from '../src/circuits/facilityGeometry';

describe('local map quality regressions',()=>{
 it('curved stands keep the same front and back row heights along their entire footprint',()=>{
  const g=createCircuitGeometry([[0,0],[.01,0],[.01,.01],[0,.01],[0,0]],4400);
  const coordinate=(x:number,z:number)=>[x/(111320*g.calibration),-z/(111320*g.calibration)] as [number,number];
  const source={url:'https://example.invalid/test-only',checkedAt:'2026-10-23',method:'estimated',confidence:'low',notes:'Synthetic regression fixture'} as const;
  const boundary=[[-100,0],[0,25],[100,0],[100,-20],[0,5],[-100,-20],[-100,0]].map(p=>coordinate(p[0],p[1]));
  const zone:SpectatorZone={zoneId:'curved',name:'curved test fixture',kind:'grandstand',availability:'available',boundary,surface:{baseHeight:2,rise:12,depth:20,eyeHeight:1.2},source,surfaces:[{surfaceId:'curved',boundary,baseHeight:2,rise:12,eyeHeight:1.2,rows:24,frontReference:coordinate(0,100)}]};
  const model=createSpectators([zone],g),surface=model.zoneSurfaces.get('curved')![0];
  const geometry=model.surfaceGeometry(surface),material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(geometry,material);mesh.updateMatrixWorld(true);
  for(const u of [.03,.2,.5,.8,.97]){
   expect(model.surfacePoint(surface,u,0).y).toBeCloseTo(2,5);expect(model.surfacePoint(surface,u,1).y).toBeCloseTo(14,5);
   // Includes exact tread boundaries, which previously put eyes on a different
   // tread from the Float32 mesh after correcting the curved-row shape.
   for(const v of [.1,.25,.5,.75,.9]){
    const eye=model.surfacePoint(surface,u,v,true),ray=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0));
    const hit=ray.intersectObject(mesh)[0];expect(hit,`${u}/${v}`).toBeDefined();expect(eye.y-hit.point.y).toBeCloseTo(1.2,2);
   }
  }
  geometry.dispose();material.dispose();
 });
 it('all shared facilities use independent sourced footprints and measured-world geometry',async()=>{
  const footprints=new Set<string>();let equipped=0;
  for(const c of circuitRegistry.filter(c=>c.circuitId!=='shanghai')){
   const d=await loadCircuit(c.circuitId),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation);
   expect(d.facilities?.circuitId).toBe(c.circuitId);
   if(d.facilities!.buildings.length)equipped++;
   for(const b of d.facilities!.buildings){
    expect(b.boundary[0]).toEqual(b.boundary.at(-1));expect(b.source.url).toMatch(/^https:\/\/www.openstreetmap.org\/way\//);
    const key=JSON.stringify(b.boundary);expect(footprints.has(key)).toBe(false);footprints.add(key);
    const model=buildingModel(d,g,b);expect(model.center.distanceTo(buildingReference(d,g,b))).toBeLessThan(1e-8);
    expect(Array.from(model.walls.getAttribute('position').array).every(Number.isFinite)).toBe(true);expect(b.heightMetres).toBeGreaterThan(3);
    model.roof.dispose();model.walls.dispose();
   }
   for(const l of d.facilities!.pitLanes){const m=pitLaneModel(d,g,l);expect(m.points.length).toBeGreaterThan(1);expect(Array.from(m.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true);m.geometry.dispose()}
  }
  expect(equipped).toBe(20);
  const silverstone=(await loadCircuit('silverstone')).facilities!;expect(silverstone.buildings.map(b=>b.id)).toEqual(['227332429']);expect(silverstone.pitLanes.map(l=>l.id)).toEqual(['227902927']);
  for(const id of ['monaco','madrid']){const f=(await loadCircuit(id)).facilities!;expect(f.buildings).toHaveLength(0);expect(f.notes).toContain('尚未核实')}
 });
 it('DEM display cuts protect road edges, never raise bridge terrain or change vehicle geometry',async()=>{
  for(const id of ['suzuka','spa','silverstone','austin','hungaroring','interlagos','spielberg','zandvoort']){
   const d=await loadCircuit(id),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),snapshot=g.geoPoints.map(p=>p.toArray());
   const cut=roadTerrain(d,g,10);
   for(let i=0;i<160;i++){
    const p=g.at(i*g.length/160),t=g.tangent(i*g.length/160),normal=new Vector3(-t.z,0,t.x).normalize();
    for(const side of [-1,1]){
     const q=p.clone().addScaledVector(normal,side*d.trackGeometry.widthMetres/2),lon=g.origin[0]+q.x/(111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration),lat=g.origin[1]-q.z/(111320*g.calibration),raw=terrainHeight(d.elevation,lon,lat),display=cut(q.x,q.z,raw);
     expect(display).toBeLessThanOrEqual(raw+1e-8);expect(display-.3,`${id} road edge ${i}`).toBeLessThan(p.y+.2);
    }
   }
   expect(g.geoPoints.map(p=>p.toArray())).toEqual(snapshot);expect(g.length).toBeCloseTo(d.lengthMetres,3);
  }
 });
});
