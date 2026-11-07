import {it,expect,afterEach} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {useLanguage} from '../src/i18n';
import {zoneName} from '../src/i18n/data';
import source from '../src/circuits/europe/monza-general-admission.json';
import inventory from '../src/circuits/season-review/monza-public-inventory.json';
afterEach(()=>useLanguage.getState().setLanguage('zh'));

it('records fifty official products without counting six Prato portions as six tickets or conflating GF and P',()=>{
 expect(inventory.ticketProducts).toHaveLength(50);expect(new Set(inventory.ticketProducts.map(p=>p.productId)).size).toBe(50);
 expect(inventory.inventoryComplete).toBe(false);expect(inventory.allListedProductsRecorded).toBe(true);
 const p=inventory.ticketProducts.filter(p=>p.code==='P');expect(p).toHaveLength(1);expect([...p[0].modelZones].sort()).toEqual(source.zones.map(z=>z.zoneId).sort());
 expect(inventory.ticketProducts.find(p=>p.code==='GF')!.modelZones).toEqual(['parabolica-gf']);
 expect(inventory.ticketProducts.filter(p=>p.code==='GT')).toHaveLength(6);
 for(const code of ['33A','33B'])expect(inventory.ticketProducts.find(p=>p.code===code)!.modelZones).toEqual(['seconda-variante-33']);
 for(const code of ['35A','35B','35C'])expect(inventory.ticketProducts.find(p=>p.code===code)!.modelZones).toEqual(['vedano-35']);
});

it('the six mapped P portions belong to one official ordinary admission family and have bilingual entries',async()=>{
 const d=await loadCircuit('monza'),zones=d.spectatorZones.filter(z=>z.zoneId.startsWith('prato-'));
 expect(zones).toHaveLength(6);expect(source.ticketFamily).toContain('Circolare Prato');
 expect(source.sourcePdfSha256).toBe('e329a9c80037914143c3ba3fdb79e61352aa0ebdb82d4dbc7f645a92a17294d2');
 expect(source.areas.map(a=>a.pdfPath)).toEqual([288,289,290,291,292,293]);
 expect(source.registration.minJacobianDeterminant).toBeGreaterThan(0);
 expect(source.registration.limitation).toContain('not external accuracy');
 for(const z of zones){
  expect(z.kind).toBe('general-admission');expect(z.openingSource?.method).toBe('published');expect(z.openingSource?.url).toContain('/2026/');
  expect(circuitRegistry.find(c=>c.circuitId==='monza')!.spectatorZoneIds).toContain(z.zoneId);
  expect(zoneName(z.name)).toBe(z.name);useLanguage.getState().setLanguage('en');expect(zoneName(z.name)).not.toMatch(/[\u4e00-\u9fff]/);useLanguage.getState().setLanguage('zh');
 }
});

it('all P patch eyes land on the actual terrain mesh, including narrow outlines and computational seams',async()=>{
 const r=createCircuitContext(await loadCircuit('monza')),material=new MeshBasicMaterial({side:DoubleSide});
 let checked=0;
 for(const [id,surfaces] of r.spectators.zoneSurfaces)if(id.startsWith('prato-'))for(const s of surfaces){
  expect(s.definition.rows).toBe(0);expect(s.definition.rise).toBe(0);expect(s.definition.terrainFollow).toBe(true);
  const mesh=new Mesh(r.spectators.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  for(const u of [.01,.5,.99])for(const v of [.01,.5,.99]){
   const floor=r.spectators.surfacePoint(s,u,v),pick=r.spectators.selectionAt(s,floor),eye=r.observer(pick);
   expect(eye.y-floor.y).toBeCloseTo(1.65,7);
   const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
   expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
   expect(r.lookTarget(pick).toArray().every(Number.isFinite)).toBe(true);checked++;
  }
  mesh.geometry.dispose();
 }
 material.dispose();expect(checked).toBe(48*9);
});

it('P views follow a real metre terrain datum change without exaggerating relative heights or observer size',async()=>{
 const d=await loadCircuit('monza'),before=createCircuitContext(d),changed=structuredClone(d);
 changed.elevation.grid!.heights=changed.elevation.grid!.heights.map(h=>h+20);
 const after=createCircuitContext(changed);
 for(const z of d.spectatorZones.filter(z=>z.zoneId.startsWith('prato-'))){
  const pick={zoneId:z.zoneId,tier:'lower' as const,u:.5,v:.5},p=before.observer(pick),q=after.observer(pick);
  // Uniform vertical translation can change floating-point curve sums by picometres.
  expect(q.x).toBeCloseTo(p.x,8);expect(q.z).toBeCloseTo(p.z,8);expect(q.y-p.y).toBeCloseTo(20,7);
  const a=before.lookTarget(pick),b=after.lookTarget(pick);expect(b.y-a.y).toBeCloseTo(20,7);
 }
});

it('source-informed defaults use the printed P neighbourhood once and preserve independent user position history',async()=>{
 const d=await loadCircuit('monza'),snapshot=JSON.stringify(d),a=createCircuitContext(d),b=createCircuitContext(d);
 for(const z of d.spectatorZones.filter(z=>z.zoneId.startsWith('prato-'))){
  const entry=z.defaultViewpoint!;expect(entry.source.notes).toContain('No raycast-based');
  a.store.getState().chooseZone(z.zoneId);b.store.getState().chooseZone(z.zoneId);
  const original=a.store.getState().selection,p=a.observer(original),g=a.geometry;
  expect(p.x).toBeCloseTo((entry.coordinate[0]-g.origin[0])*111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration,7);
  expect(p.z).toBeCloseTo(-(entry.coordinate[1]-g.origin[1])*111320*g.calibration,7);
  a.store.getState().select({...original,u:.13,v:.42});a.store.getState().look(.2,.1);
  a.store.getState().chooseZone('centrale');a.store.getState().chooseZone(z.zoneId);
  expect(a.store.getState().selection).toEqual({...original,u:.13,v:.42});expect(a.store.getState().heading).toBeCloseTo(.2,8);
  expect(b.store.getState().selection).toEqual(original);
 }
 expect(JSON.stringify(d)).toBe(snapshot);
 const malformed=structuredClone(d);malformed.spectatorZones.find(z=>z.zoneId==='prato-lesmo')!.defaultViewpoint!.surfaceId='not-a-surface';
 const r=createCircuitContext(malformed);r.store.getState().chooseZone('prato-lesmo');expect(r.store.getState().selection).toEqual({zoneId:'prato-lesmo',tier:'lower',u:.5,v:.5});
});
