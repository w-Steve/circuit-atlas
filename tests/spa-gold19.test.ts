import {expect,it} from 'vitest';
import {DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
import {buildingModel} from '../src/circuits/facilityGeometry';
import source from '../src/circuits/europe/spa-structural-datums.json';

function previous(data:CircuitPackage):CircuitPackage{
 return {...data,spectatorZones:data.spectatorZones.map(z=>z.zoneId!=='gold-9-pole-position'?z:{...z,boundary:source.registration.previousManualBoundary as [number,number][],surface:{...z.surface,depth:24},surfaces:z.surfaces!.map((s,i)=>i?s:({...s,boundary:source.registration.previousManualBoundary as [number,number][],rowFrontEdge:undefined,frontReference:source.registration.previousFrontReference as [number,number]}))})};
}
function physicalScene(r:ReturnType<typeof createCircuitContext>){
 const material=new MeshBasicMaterial({side:DoubleSide}),meshes:Mesh[]=[];
 for(const surfaces of r.spectators.zoneSurfaces.values())for(const s of surfaces){
  const m=new Mesh(r.spectators.surfaceGeometry(s,p=>r.geometry.groundAt(p.x,p.y)-.15),material);m.name=s.zone.zoneId;m.updateMatrixWorld(true);meshes.push(m);
 }
 for(const b of r.data.facilities?.buildings??[]){const model=buildingModel(r.data,r.geometry,b);for(const g of [model.walls,model.roof]){const m=new Mesh(g,material);m.name=`building:${b.id}`;m.updateMatrixWorld(true);meshes.push(m)}}
 return {hit:(id:string,u:number,v:number)=>{const s={zoneId:id,tier:'lower' as const,u,v},eye=r.observer(s),target=r.lookTarget(s);return new Raycaster(eye,target.clone().sub(eye).normalize(),.05,eye.distanceTo(target)-.05).intersectObjects(meshes)[0]},dispose:()=>{meshes.forEach(m=>m.geometry.dispose());material.dispose()}};
}
it('Gold 9 follows the independent organizer diagram, preserving the original Gold 1 and vertical estimates',async()=>{
 const data=await loadCircuit('spa'),one=data.spectatorZones.find(z=>z.zoneId==='gold-1-pit')!,nine=data.spectatorZones.find(z=>z.zoneId==='gold-9-pole-position')!;
 expect(one.boundary).toEqual([[5.9656638,50.4431088],[5.9653925,50.4430111],[5.9647705,50.4437118],[5.9650418,50.4438095],[5.9656638,50.4431088]]);
 expect(data.spectatorZones.filter(z=>z.kind==='grandstand')).toHaveLength(21);expect(data.spectatorZones.filter(z=>z.availability==='available')).toHaveLength(27);
 expect(nine.surfaces![0]).toMatchObject({baseHeight:2.2,rise:11.52,rows:23,eyeHeight:1.2});expect(nine.source.confidence).toBe('low');expect(nine.openingSource?.url).toContain('2026');
 const {origin,metresPerDegree,affineMatrixMetres:M,diagramPoints}=source.registration;
 for(let i=0;i<4;i++){
  const [x,y]=diagramPoints.G9[i],p=[x*M[0][0]+y*M[1][0]+M[2][0],x*M[0][1]+y*M[1][1]+M[2][1]];
  expect(nine.boundary[i][0]).toBeCloseTo(origin[0]+p[0]/metresPerDegree[0],12);expect(nine.boundary[i][1]).toBeCloseTo(origin[1]+p[1]/metresPerDegree[1],12);
 }
 // Retain the independently identified intermediate area in the source record.
 expect(source.unmodeledReferenceAreas[0].name).toBe('Gold 9 Bis');
});
it('reproduces the three old Gold 1 blocked rays and verifies dense real geometry after source-based correction',async()=>{
 const data=await loadCircuit('spa'),old=createCircuitContext(previous(data)),next=createCircuitContext(data),before=physicalScene(old),after=physicalScene(next);
 try{
  for(const v of [.05,.5,.95]){
   expect(before.hit('gold-1-pit',.05,v)?.object.name).toBe('gold-9-pole-position');
   const s={zoneId:'gold-1-pit',tier:'lower' as const,u:.05,v};expect(next.observer(s).distanceTo(old.observer(s))).toBe(0);expect(next.lookTarget(s).distanceTo(old.lookTarget(s))).toBe(0);
  }
  for(const id of ['gold-1-pit','gold-9-pole-position'])for(const u of [.01,.05,.2,.5,.8,.95,.99])for(const v of [.01,.05,.2,.4,.5,.6,.8,.95,.99])expect(after.hit(id,u,v),`${id} ${u}/${v}`).toBeUndefined();
 }finally{before.dispose();after.dispose()}
});
