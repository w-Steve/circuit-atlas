import {it,expect} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {terrainSpectatorZones} from '../src/circuits/spectatorDatum';
import {createSpectators} from '../src/circuits/spectators';
import {terrainHeight} from '../src/circuits/elevation';

it('Montreal 15 straight rows follow their mapped front instead of rotating toward the rear notch',async()=>{
 const d=await loadCircuit('montreal'),snapshot=JSON.stringify(d),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation);
 const raw=d.spectatorZones.find(z=>z.zoneId==='grandstand-15')!.surfaces![0];
 expect(raw.rowFrontEdge!.coordinates).toEqual(raw.boundary.slice(0,2));expect(raw.rows).toBe(32);expect(raw.rise).toBe(16);expect(raw.baseHeight).toBe(2.2);expect(raw.eyeHeight).toBe(1.2);
 const run=(legacy:boolean)=>{
  const zones=terrainSpectatorZones(d),definition=zones.find(z=>z.zoneId==='grandstand-15')!.surfaces![0];
  if(legacy)delete definition.rowFrontEdge;
  const m=createSpectators(zones,g),s=m.zoneSurfaces.get('grandstand-15')![0];
  const mesh=new Mesh(m.surfaceGeometry(s,p=>terrainHeight(d.elevation,g.origin[0]+p.x/(111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration),g.origin[1]-p.y/(111320*g.calibration))-.15),new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld(true);
  const hits=[];
  for(const u of [.01,.05,.15,.3,.5,.7,.85,.95,.99])for(const v of [.01,.05,.3,.5,.7,.95,.99]){
   const eye=m.zonePoint('grandstand-15',u,v),q=m.facingTarget('grandstand-15',u,v).add(new Vector3(0,.9,0));
   expect(eye.y-m.zonePoint('grandstand-15',u,v,false).y).toBeCloseTo(1.2,8);
   if(new Raycaster(eye,q.clone().sub(eye).normalize(),.05,eye.distanceTo(q)-.05).intersectObject(mesh).length)hits.push({u,v});
  }
  mesh.geometry.dispose();mesh.material.dispose();return {s,hits};
 };
 const before=run(true),after=run(false);expect(before.hits).toContainEqual({u:.95,v:.05});expect(after.hits).toEqual([]);
 expect(after.s.points).toEqual(before.s.points);expect(after.s.definition.baseHeight).toBe(before.s.definition.baseHeight);
 const edge=after.s.points[1].clone().sub(after.s.points[0]).normalize();expect(Math.abs(edge.dot(after.s.axis))).toBeCloseTo(1,10);
 expect(JSON.stringify(d)).toBe(snapshot);
});

it('a seating axis requires a real non-degenerate original edge',async()=>{
 const d=structuredClone(await loadCircuit('montreal')),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation);
 const s=d.spectatorZones.find(z=>z.zoneId==='grandstand-15')!.surfaces![0];
 s.rowFrontEdge!.coordinates[1]=[0,0];expect(()=>createSpectators(terrainSpectatorZones(d),g)).toThrow('Invalid seating front edge');
 s.rowFrontEdge!.coordinates[1]=s.rowFrontEdge!.coordinates[0];expect(()=>createSpectators(terrainSpectatorZones(d),g)).toThrow('Invalid seating front edge');
});
