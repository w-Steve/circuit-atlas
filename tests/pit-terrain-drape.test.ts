import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {buildingModel,pitLaneModel} from '../src/circuits/facilityGeometry';

async function fixture(){
 const data=structuredClone(await loadCircuit('silverstone'));
 const source=JSON.parse(readFileSync('src/circuits/elevation-source/candidates/silverstone-ea-dtm.json','utf8'));
 data.elevation={...data.elevation,grid:source.grid};
 const g=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
 return {data,g};
}
it('drapes the retained pit polygon vertically without changing its area, holes or source route',async()=>{
 const {data,g}=await fixture(),lane=data.facilities!.pitLanes[0],snapshot=JSON.stringify(lane);
 const old=pitLaneModel(data,g,{...lane,terrainMeshSpacingMetres:undefined}),next=pitLaneModel(data,g,{...lane,terrainMeshSpacingMetres:2});
 const area=(mesh:typeof old.geometry)=>{const p=mesh.getAttribute('position');let sum=0;for(let i=0;i<(mesh.index?.count??p.count);i+=3){const ids=[0,1,2].map(j=>mesh.index?mesh.index.getX(i+j):i+j),[a,b,c]=ids;sum+=Math.abs((p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a))-(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a)))/2}return sum};
 try{
  expect(next.points.map(p=>p.toArray())).toEqual(old.points.map(p=>p.toArray()));
  // GPU Float32 midpoint rounding accumulates sub-mm boundary error over the
  // long perimeter. Limit area drift to20ppm, rather than exact double equality.
  expect(Math.abs(area(next.geometry)-area(old.geometry))/area(old.geometry)).toBeLessThan(.00002);
  const p=next.geometry.getAttribute('position');expect(p.count).toBeLessThan(200000);
  for(let i=0;i<p.count;i+=3)for(const weights of [[1,0,0],[0,1,0],[0,0,1],[1/3,1/3,1/3]]){
   const xyz=[0,1,2].map(dim=>weights.reduce((n,w,j)=>n+w*p.getComponent(i+j,dim),0));
   expect(xyz[1]-g.groundAt(xyz[0],xyz[2])).toBeGreaterThan(.05);
  }
  expect(JSON.stringify(lane)).toBe(snapshot);
 }finally{old.geometry.dispose();next.geometry.dispose()}
});
it('rejects invalid subdivision settings before allocating a huge mesh',async()=>{
 const {data,g}=await fixture(),lane=data.facilities!.pitLanes[0];
 for(const spacing of [0,-1,Infinity,NaN,100])expect(()=>pitLaneModel(data,g,{...lane,terrainMeshSpacingMetres:spacing})).toThrow('Invalid pit terrain mesh spacing');
});
it('extends the foundation down to ground without moving the roof or raising the building',async()=>{
 const {data,g}=await fixture(),building=data.facilities!.buildings[0];
 const old=buildingModel(data,g,{...building,foundationToTerrain:false}),next=buildingModel(data,g,{...building,foundationToTerrain:true});
 try{
  expect(next.base).toBe(old.base);expect(next.height).toBe(old.height);
  expect(Array.from(next.roof.getAttribute('position').array)).toEqual(Array.from(old.roof.getAttribute('position').array));
  const a=old.walls.getAttribute('position'),b=next.walls.getAttribute('position');let extended=0;
  for(let i=0;i<a.count;i++){
   expect(b.getX(i)).toBe(a.getX(i));expect(b.getZ(i)).toBe(a.getZ(i));
   expect(b.getY(i)).toBeLessThanOrEqual(a.getY(i));if(b.getY(i)<a.getY(i)-.01)extended++;
  }
  expect(extended).toBeGreaterThan(0);
 }finally{for(const m of [old,next]){m.walls.dispose();m.roof.dispose()}}
});
