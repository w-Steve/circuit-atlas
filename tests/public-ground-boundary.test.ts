import {it,expect} from 'vitest';
import {Vector2} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {terrainSpectatorZones} from '../src/circuits/spectatorDatum';

it('Zandvoort source-polygon edges remain selectable across numerical platforms without admitting points a millimetre outside',async()=>{
 const d=await loadCircuit('zandvoort'),snapshot=JSON.stringify(d.spectatorZones);
 const g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),m=createSpectators(terrainSpectatorZones(d),g);
 let checked=0;
 for(const surfaces of m.zoneSurfaces.values())for(const s of surfaces.filter(s=>s.definition.terrainFollow))for(const u of [.1,.5,.9])for(const v of [0,1]){
  const p=m.surfacePoint(s,u,v);
  expect(p.toArray().every(Number.isFinite)).toBe(true);
  for(const dx of [-1e-8,0,1e-8])for(const dz of [-1e-8,0,1e-8]){
   expect(m.floorHeight(s,new Vector2(p.x+dx,p.z+dz))).toBeCloseTo(p.y,5);checked++;
  }
 }
 expect(checked).toBeGreaterThan(1000);
 const s=m.zoneSurfaces.get('ga1')![0],p=m.surfacePoint(s,.5,1);
 expect(p.x).toBeCloseTo(200,6); // This source partition's eastern edge.
 expect(()=>m.floorHeight(s,new Vector2(p.x+.001,p.z))).toThrow('outside the public-ground mesh');
 expect(JSON.stringify(d.spectatorZones)).toBe(snapshot);
});
