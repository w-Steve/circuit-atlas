import {it,expect} from 'vitest';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import review from '../src/circuits/europe/silverstone-inside-nine-2026.json';
for(const zone of review.zones)it(`keeps ${zone.zoneId} standing on every source-ground patch`,async()=>{
 const data=await loadCircuit('silverstone'),runtime=createCircuitContext(data),m=runtime.spectators;
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

it('uses one current enclosure and resolves the old name without making ordinary GA inclusive',async()=>{
 const d=await loadCircuit('silverstone');expect(d.spectatorZones.filter(z=>z.zoneId==='inside-nine')).toHaveLength(1);
 expect(d.spectatorZoneAliases?.['copse-yard']).toBe('inside-nine');
 expect(d.spectatorZones.some(z=>z.zoneId==='copse-yard')).toBe(false);
 expect(d.spectatorZones.find(z=>z.zoneId==='inside-nine')!.admissionNote).toContain('需适用门票');
});
