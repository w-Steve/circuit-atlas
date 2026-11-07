import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector2,Vector3} from 'three';
import source from '../src/circuits/europe/silverstone-vale-ga-2026.json';
import vale from '../src/circuits/europe/silverstone-vale-2026.json';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {SpectatorZone} from '../src/circuits/types';
const inside=(p:Vector2,ring:Vector2[])=>{let result=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)result=!result}return result};
it('limits the approximate GA band to native front-ground and keeps standing eyes on its real mesh',async()=>{
 const data=structuredClone(await loadCircuit('silverstone'));data.spectatorZones=data.spectatorZones.filter(z=>z.zoneId!==source.zone.zoneId);data.spectatorZones.push({...source.zone,availability:'available'} as SpectatorZone);
 const rt=createCircuitContext(data),g=rt.geometry,m=rt.spectators,surface=m.zoneSurfaces.get(source.zone.zoneId)![0];
 const xy=([lon,lat]:number[])=>new Vector2((lon-g.origin[0])*111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration,-(lat-g.origin[1])*111320*g.calibration);
 const native=vale.gaEvidence.nativeGroundBoundary.map(xy),a=xy(vale.zone.boundary[2]),b=xy(vale.zone.boundary[3]),axis=b.clone().sub(a).normalize(),length=a.distanceTo(b);
 expect(source.mapDrawingIndex).toBe(41);expect(source.zone.source.confidence).toBe('low');expect(source.selectionAreaMetres2).toBeLessThan(source.nativeGroundAreaMetres2);expect(source.zone.admissionNote).toContain('近似范围');
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(m.surfaceGeometry(surface),material);mesh.updateMatrixWorld(true);
 try{for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+.998*i/20,v=.001+.998*j/20,eye=m.zonePoint(source.zone.zoneId,u,v),floor=m.zonePoint(source.zone.zoneId,u,v,false),pick=m.selectionAt(surface,eye),p=new Vector2(floor.x,floor.z),along=p.clone().sub(a).dot(axis);
  expect(inside(p,native)).toBe(true);expect(along).toBeGreaterThanOrEqual(0);expect(along).toBeLessThanOrEqual(length);expect(pick.u).toBeCloseTo(u,5);expect(pick.v).toBeCloseTo(v,5);expect(eye.y-floor.y).toBeCloseTo(1.65,8);
  expect(new Raycaster(eye,new Vector3(0,-1,0),0,2).intersectObject(mesh)[0]?.distance).toBeCloseTo(1.65,3);
 }}finally{mesh.geometry.dispose();material.dispose()}
 const missing=structuredClone(data);missing.barriers!.barriers=missing.barriers!.barriers.filter(b=>b.id!=='vale-trackside-fence');expect(()=>createCircuitContext(missing)).toThrow('Required spectator barrier geometry unavailable');
});
