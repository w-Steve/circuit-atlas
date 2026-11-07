import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import source from '../src/circuits/season-review/madrid-main-candidate.json';
it('retains two source-authored vector banks and explicit unpromoted annual-source limits',()=>{
 expect(source.status).toBe('candidate-not-applied');expect(source.areas.map(a=>a.zoneId)).toEqual(['stand-2','stand-1']);expect(source.source.cdxSha1Matches).toBe(false);
 expect(source.registration.rmsMetres).toBeLessThan(8);expect(source.limitations.join(' ')).toContain('before promotion');
 for(const a of source.areas){expect(a.sourcePixelBoundary).toHaveLength(5);expect(a.sourcePixelBoundary[0]).toEqual(a.sourcePixelBoundary.at(-1));expect(a.roadIntersectionMetres2).toBe(0);expect(a.otherZoneIntersections).toEqual([])}
});
it('places seated candidate eyes on the shared bank mesh with reversible continuous picks',async()=>{
 const d=structuredClone(await loadCircuit('madrid'));
 for(const a of source.areas){const z=d.spectatorZones.find(z=>z.zoneId===a.zoneId)!;z.boundary=a.candidateBoundary as [number,number][];z.surfaces![0].boundary=z.boundary;delete z.surfaces![0].frontReference;z.availability='available'}
 const m=createCircuitContext(d).spectators,material=new MeshBasicMaterial({side:DoubleSide});
 for(const a of source.areas){
  const s=m.zoneSurfaces.get(a.zoneId)![0],mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  for(const u of [.1,.5,.9])for(const v of [.1,.5,.9]){
   const floor=m.zonePoint(a.zoneId,u,v,false),eye=m.zonePoint(a.zoneId,u,v),pick=m.selectionAt(s,floor);
   expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(m.zonePoint(a.zoneId,pick.u,pick.v).distanceTo(eye)).toBeLessThan(1e-4);
   const hit=new Raycaster(eye.clone().add(new Vector3(0,100,0)),new Vector3(0,-1,0)).intersectObject(mesh)[0];expect(hit).toBeDefined();expect(hit.point.distanceTo(floor)).toBeLessThan(1e-4);
  }
  mesh.geometry.dispose();
 }
 material.dispose();
});
