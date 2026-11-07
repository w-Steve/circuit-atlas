import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/europe/barcelona-pelouse-privilege-2026.json';
for(const zone of review.zones)it(`keeps ${zone.zoneId} standing on every source-ground patch`,async()=>{
 const data=await loadCircuit('barcelona'),runtime=createCircuitContext(data),m=runtime.spectators;
 const surfaces=m.zoneSurfaces.get(zone.zoneId)!;
 expect(surfaces.length).toBe(zone.surfaces.length);
 for(const s of surfaces){
  const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(s),material);mesh.updateMatrixWorld(true);
  try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
   const u=.001+i*.998/20,v=.001+j*.998/20,eye=m.surfacePoint(s,u,v,true),floor=m.surfacePoint(s,u,v,false);
   expect(eye.y-floor.y).toBeCloseTo(1.65,8);
   expect(new Raycaster(eye,new Vector3(0,-1,0),0,1.8).intersectObject(mesh)[0]?.distance,JSON.stringify({surface:s.definition.surfaceId,u,v,eye:eye.toArray()})).toBeCloseTo(1.65,3);
   expect(runtime.observer(m.selectionAt(s,floor)).distanceTo(eye)).toBeLessThan(.03);
  }}finally{mesh.geometry.dispose();material.dispose()}
 }
 expect(zone.source.method).toBe('estimated');
});

it('keeps member-only privilege distinct from ordinary Pelouse and covers all modeled ground sectors',async()=>{
 const {default:identity}=await import('../src/circuits/season-review/barcelona-public-map-identity-review.json');
 const data=await loadCircuit('barcelona'),zone=data.spectatorZones.find(z=>z.zoneId==='pelouse-privilege')!;
 expect(zone.admissionNote).toContain('普通 Pelouse 票不可进入');
 expect(zone.openingSource?.url).toBe('https://www.circuitcat.com/en/frequently-asked-questions-membership/');
 expect(identity.confirmedMissingProducts).toEqual([]);
 expect(new Set(identity.practicalCoverageReview.sectors.map(s=>s.modelZoneId))).toEqual(new Set(data.spectatorZones.filter(z=>z.kind!=='grandstand').map(z=>z.zoneId)));
 expect(identity.practicalCoverageReview.sectors).toHaveLength(7);
});
