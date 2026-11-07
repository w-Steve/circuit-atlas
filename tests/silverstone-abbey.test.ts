import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import osm from '../src/circuits/europe/osm/silverstone-osm.json';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {terrainSpectatorZones} from '../src/circuits/spectatorDatum';
import {createSpectators} from '../src/circuits/spectators';

it('Silverstone retains the complete original Abbey building as B and models the separately mapped short A',async()=>{
 const d=await loadCircuit('silverstone'),a=d.spectatorZones.find(z=>z.zoneId==='abbey-a')!,b=d.spectatorZones.find(z=>z.zoneId==='abbey-b')!;
 const building=osm.elements.find(e=>e.id===227342458)!;
 expect(b.boundary).toEqual(building.geometry.map(p=>[p.lon,p.lat]));expect(a.boundary).not.toEqual(b.boundary);
 const g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),m=createSpectators(terrainSpectatorZones(d),g);
 const sa=m.zoneSurfaces.get('abbey-a')![0],sb=m.zoneSurfaces.get('abbey-b')![0];
 // Independent contractor measurements corroborate the relative long/short
 // association; they are rear/side advertising lengths, not seat survey data.
 expect((sa.max-sa.min)/(sb.max-sb.min)).toBeCloseTo(55/156,1);
 for(const [z,rows,rise] of [[a,18,8.83],[b,20,10.08]] as const){
  expect(z.surfaces![0].rows).toBe(rows);expect(z.surfaces![0].rise).toBe(rise);expect(z.surfaces![0].baseHeight).toBe(2.2);expect(z.surfaces![0].eyeHeight).toBe(1.2);
  expect(z.source.confidence).toBe('low');expect(z.openingSource?.notes).toContain('2026');expect(z.surfaces![0].rowFrontEdge).toBeDefined();
 }
 // BOXPARK standing terrace replaces the rejected seated prototype.
 expect(d.spectatorZones.find(z=>z.zoneId==='boxpark-hangar')?.availability).toBe('available');
 expect(d.spectatorZones.filter(z=>z.availability==='available'&&z.kind==='grandstand')).toHaveLength(28);
 for(const id of ['club-corner-a','club-corner'])expect(d.spectatorZones.find(z=>z.zoneId===id)?.availability).toBe('available');
 for(const id of ['club-corner-b','club-corner-c'])expect(d.spectatorZones.some(z=>z.zoneId===id)).toBe(false);
});

it('both Abbey zones clear retained stand meshes across the seating range without increasing eye height',async()=>{
 const d=await loadCircuit('silverstone'),snapshot=JSON.stringify(d),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),m=createSpectators(terrainSpectatorZones(d),g),material=new MeshBasicMaterial({side:DoubleSide});
 const meshes=[...m.zoneSurfaces.values()].flat().map(s=>{const mesh=new Mesh(m.surfaceGeometry(s,p=>g.groundAt(p.x,p.y)-.15),material);mesh.updateMatrixWorld(true);return mesh});
 for(const id of ['abbey-a','abbey-b'])for(const u of [.01,.05,.15,.3,.5,.7,.85,.95,.99])for(const v of [.01,.05,.3,.5,.7,.95,.99]){
  const eye=m.zonePoint(id,u,v),floor=m.zonePoint(id,u,v,false),q=m.facingTarget(id,u,v).add(new Vector3(0,.9,0));
  expect(eye.y-floor.y).toBeCloseTo(1.2,8);
  expect(new Raycaster(eye,q.clone().sub(eye).normalize(),.05,eye.distanceTo(q)-.05).intersectObjects(meshes),`${id} ${u}/${v}`).toHaveLength(0);
 }
 meshes.forEach(m=>m.geometry.dispose());material.dispose();expect(JSON.stringify(d)).toBe(snapshot);
});
