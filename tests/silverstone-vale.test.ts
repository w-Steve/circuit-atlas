import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import source from '../src/circuits/europe/silverstone-vale-2026.json';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {SpectatorZone,CircuitBarrierPackage} from '../src/circuits/types';
it('restores the complete named native building with seated eyes on actual metric steps',async()=>{
 const data=structuredClone(await loadCircuit('silverstone'));
 data.spectatorZones=data.spectatorZones.filter(z=>z.zoneId!=='vale');data.spectatorZones.push({...source.zone,availability:'available'} as SpectatorZone);
 data.barriers={...source.barrierLayer,availability:'available',barriers:[...(data.barriers?.barriers??[]).filter(b=>b.id!=='vale-trackside-fence'),...source.barrierLayer.barriers]} as CircuitBarrierPackage;
 const rt=createCircuitContext(data),zone=rt.spectators.zoneById('vale')!,surface=rt.spectators.zoneSurfaces.get('vale')![0];
 expect(zone.boundary).toEqual(source.zone.boundary);expect(data.spectatorZones.find(z=>z.zoneId==='vale')!.surfaces![0]).toMatchObject({rows:17,rise:8.64,baseHeight:2.2,eyeHeight:1.2,rowPitch:{treadMetres:1.02,riserMetres:.54}});
 expect(source.nativeStandWay).toBe(227342453);expect(source.gaEvidence.runtimeGAAdded).toBe(false);
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(rt.spectators.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
 try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+.998*i/20,v=.001+.998*j/20,eye=rt.spectators.zonePoint('vale',u,v),floor=rt.spectators.zonePoint('vale',u,v,false),pick=rt.spectators.selectionAt(surface,eye);
  expect(pick.u).toBeCloseTo(u,5);expect(pick.v).toBeCloseTo(v,5);expect(eye.y-floor.y).toBeCloseTo(1.2,8);expect(floor.y-rt.geometry.groundAt(floor.x,floor.z)).toBeGreaterThan(0);
  const hit=new Raycaster(eye,new Vector3(0,-1,0),0,2).intersectObject(mesh)[0];expect(hit?.distance).toBeCloseTo(1.2,3);
 }}finally{mesh.geometry.dispose();material.dispose()}
 const missing=structuredClone(data);missing.barriers!.barriers=missing.barriers!.barriers.filter(b=>b.id!=='vale-trackside-fence');expect(()=>createCircuitContext(missing)).toThrow('Required spectator barrier geometry unavailable');
});
