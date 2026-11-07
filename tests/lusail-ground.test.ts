import {it,expect,afterEach} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {useLanguage} from '../src/i18n';
import {zoneName} from '../src/i18n/data';
import source from '../src/circuits/asia/lusail-general-admission.json';
afterEach(()=>useLanguage.getState().setLanguage('zh'));

it('records the official ordinary Hill without equating ticket opening with validated structural geometry',async()=>{
 const d=await loadCircuit('lusail'),r=createCircuitContext(d),z=d.spectatorZones.find(z=>z.zoneId==='lusail-hill')!;
 expect(z.kind).toBe('general-admission');expect(z.openingSource?.method).toBe('published');
 expect(z.openingSource?.url).toContain('2026');expect(z.source.confidence).toBe('low');
 expect(circuitRegistry.find(c=>c.circuitId==='lusail')!.spectatorZoneIds).toContain('lusail-hill');
 expect(z.availability).toBe('available');expect(z.surfaceSource?.notes).toContain('Ground may occlude');
 expect(r.spectators.zoneById('lusail-hill')).toBeDefined();
 expect(r.spectators.spectatorZones.some(z=>/lounge/i.test(z.name))).toBe(false);
 expect(zoneName(z.name)).toBe('Lusail Hill 普通观赛区');
 useLanguage.getState().setLanguage('en');expect(zoneName(z.name)).toBe('Lusail Hill General Admission');
 expect(source.sourceSha256).toBe('dd7252b59d0c733e65c0a5a7346ecbb1117b4093c269a0d8cec694532f2eb577');
 expect(source.registration.globalAffineRmsMetres).toBeGreaterThan(20);
 expect(source.registration.limitation).toContain('not external validation');
 expect(source.visibilityReview.standingReview.eyeHeightMetres).toBe(1.65);
 expect(source.visibilityReview.standingReview.visualAcceptance).toBe(false);
 expect(source.structuralSourceReview.authority.publishedAt).toBe('2023-09-24');
 expect(source.structuralSourceReview.rejectedSubstitution.reason).toContain('underpass');
 expect(source.structuralSourceReview.geometryChanged).toBe(false);
 expect(source.visibilityReview.standingReview.redPixels.desktop).toBeGreaterThan(source.visibilityReview.standingReview.legacyThreshold);
 // The retained photo passed a pixel count yet still showed only the upper car.
 // Availability must not be inferred from a small red-pixel threshold.
});

it('candidate patch eyes match its unexaggerated mesh without treating geometric compatibility as availability',async()=>{
 const d=structuredClone(await loadCircuit('lusail'));d.spectatorZones.find(z=>z.zoneId==='lusail-hill')!.availability='available';
 const r=createCircuitContext(d),material=new MeshBasicMaterial({side:DoubleSide});
 for(const s of r.spectators.zoneSurfaces.get('lusail-hill')!){
  expect(s.definition.terrainFollow).toBe(true);expect(s.definition.rows).toBe(0);expect(s.definition.rise).toBe(0);
  const mesh=new Mesh(r.spectators.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  for(const u of [.01,.25,.5,.75,.99])for(const v of [.01,.25,.5,.75,.99]){
   const floor=r.spectators.surfacePoint(s,u,v),pick=r.spectators.selectionAt(s,floor),eye=r.observer(pick);
   expect(eye.y-floor.y).toBeCloseTo(1.65,7);
   const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];
   // GPU vertices are Float32 world metres; 0.1mm covers their rounding at this extent.
   expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
   expect(r.lookTarget(pick).toArray().every(Number.isFinite)).toBe(true);
  }
  mesh.geometry.dispose();
 }
 material.dispose();
});

it('retains the real modeled ground intersection instead of flattening the hill to claim clear sightlines',async()=>{
 const d=structuredClone(await loadCircuit('lusail'));d.spectatorZones.find(z=>z.zoneId==='lusail-hill')!.availability='available';
 const r=createCircuitContext(d),material=new MeshBasicMaterial({side:DoubleSide});
 const meshes=r.spectators.zoneSurfaces.get('lusail-hill')!.map(s=>{const m=new Mesh(r.spectators.surfaceGeometry(s),material);m.name=s.definition.surfaceId;m.updateMatrixWorld(true);return m});
 const pick={zoneId:'lusail-hill',tier:'lower' as const,u:.5,v:.95},floor=r.observerFloor(pick),eye=floor.clone().add(new Vector3(0,1.2,0)),target=r.lookTarget(pick);
 const hit=new Raycaster(eye,target.clone().sub(eye).normalize(),.05,eye.distanceTo(target)-.05).intersectObjects(meshes)[0];
 expect(hit?.object.name).toBe(source.visibilityReview.knownSample.obstacle);
 // Retain the old1.2m obstruction evidence. The requested automatic standing
 // eye can clear it without modifying a triangle; that is not full acceptance.
 const standing=r.observer(pick);expect(standing.y-floor.y).toBeCloseTo(1.65,7);
 expect(new Raycaster(standing,target.clone().sub(standing).normalize(),.05,standing.distanceTo(target)-.05).intersectObjects(meshes)).toHaveLength(0);
 expect(source.visibilityReview.terrainIntersections).toBe(1);
 meshes.forEach(m=>m.geometry.dispose());material.dispose();
});
