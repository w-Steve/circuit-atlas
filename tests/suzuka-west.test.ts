import groundReview from '../src/circuits/season-review/suzuka-j-ground-review-2026.json';
import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import source from '../src/circuits/asia/suzuka-west-ground.json';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {zoneName} from '../src/i18n/data';
import {useLanguage} from '../src/i18n';

it('retains six geographic portions of one west ticket with explicit source-year and missing-geometry limits',async()=>{
 const d=await loadCircuit('suzuka');expect(source.ticketFamily).toBe('West Area / 西エリア券');expect(source.inventoryComplete).toBe(false);expect(source.sourceYearLimitation).toContain('2027');
 expect(source.openingEvidence).toMatchObject({publishedAt:'2025-08-28',sha256:'10fec6b8327b3e15d60d0dcacb6b688e7c01a0470c4f6142529cf2b4aa90aebb'});
 expect(source.registration.minJacobianDeterminant).toBeGreaterThan(0);expect(source.registration.globalAffineRmsMetres).toBeLessThan(35);
 expect(source.sourceImageSha256).toBe('27d75c0d9fba686e02b3a20a06d4d7f2366d377f7d5eaba875608a8e35158da5');
 for(const area of source.areas)for(const p of area.pixelPolygons){expect(p.exterior.length).toBeGreaterThan(3);expect(Array.isArray(p.holes)).toBe(true)}
 expect(source.zones).toHaveLength(6);expect(source.zones.filter(z=>z.availability==='available')).toHaveLength(6);
 for(const z of source.zones){expect(d.spectatorZones.find(s=>s.zoneId===z.zoneId)).toEqual(z);expect(z.kind).toBe('general-admission');expect(z.openingSource.url).toContain('/2025/08/');useLanguage.getState().setLanguage('en');try{expect(zoneName(z.name)).not.toMatch(/[\u4e00-\u9fff]/)}finally{useLanguage.getState().setLanguage('zh')}}
 expect(d.spectatorZones.find(z=>z.zoneId==='west-j')!.geometryReview!.method).toContain('blocked photograph alone does not prove a model error');
});

it('every exposed west patch has a real ground mesh and human eyes above the same floor',async()=>{
 const r=createCircuitContext(await loadCircuit('suzuka')),material=new MeshBasicMaterial({side:DoubleSide});let checked=0;
 for(const [id,surfaces] of r.spectators.zoneSurfaces)if(id.startsWith('west-'))for(const s of surfaces){
  expect(s.definition.terrainFollow).toBe(true);expect(s.definition.rows).toBe(0);expect(s.definition.rise).toBe(0);
  const mesh=new Mesh(r.spectators.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  for(const u of [.01,.5,.99])for(const v of [.01,.5,.99]){
   const floor=r.spectators.surfacePoint(s,u,v),pick=r.spectators.selectionAt(s,floor),standing=r.observer(pick);
   expect(standing.y-floor.y).toBeCloseTo(1.65,7);expect(standing.x).toBeCloseTo(floor.x,8);expect(standing.z).toBeCloseTo(floor.z,8);
   const hit=new Raycaster(standing.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);checked++;
  }mesh.geometry.dispose();
 }material.dispose();expect(checked).toBe(40*9);
});

it('opening approximate J preserves all source ground, human height and initial position',async()=>{
 const z=(await loadCircuit('suzuka')).spectatorZones.find(z=>z.zoneId==='west-j')!;
 const old=groundReview.legacyHeldZone;
 expect(z.boundary).toEqual(old.boundary);expect(z.surfaces).toEqual(old.surfaces);
 expect(z.defaultViewpoint).toEqual(old.defaultViewpoint);expect(z.surface).toEqual(old.surface);
 expect(groundReview.groundDiagnostic.sourceGroundBlockedCount).toBe(6);
 expect(groundReview.groundDiagnostic.standingHeightMetres).toBe(1.65);
});
