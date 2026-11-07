import {expect,it} from 'vitest';
import {BufferGeometry,DoubleSide,Float32BufferAttribute,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {createPitRoadJoin} from '../src/circuits/pitRoadJoin';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {mapRoad} from '../src/circuits/mapRoad';
import {pitLaneModel} from '../src/circuits/facilityGeometry';

function rectangle(x0:number,x1:number,z0:number,z1:number,y:number){
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([x0,y,z0,x1,y,z0,x0,y,z1,x1,y,z1],3));g.setIndex([0,1,2,1,3,2]);return g;
}
function hits(g:BufferGeometry,x:number,z:number){
 const mat=new MeshBasicMaterial({side:DoubleSide}),m=new Mesh(g,mat);m.updateMatrixWorld(true);
 const result=new Raycaster(new Vector3(x,100,z),new Vector3(0,-1,0)).intersectObject(m);mat.dispose();return result;
}
it('retains outside pit pavement and joins its boundary to the racing deck, without duplicate overlap',()=>{
 const road=rectangle(-2,2,-10,10,.2),pit=rectangle(-5,5,-3,3,.45),before=Array.from(pit.getAttribute('position').array),joined=createPitRoadJoin(road)(pit);
 expect(hits(joined,0,.37)).toHaveLength(0);expect(hits(joined,-4,.37)).not.toHaveLength(0);expect(hits(joined,4,.37)).not.toHaveLength(0);
 const p=joined.getAttribute('position');let seams=0;
 for(let i=0;i<p.count;i++){
  if(Math.abs(Math.abs(p.getX(i))-2)<1e-5){expect(p.getY(i)).toBeCloseTo(.2,6);seams++}
  expect(p.getX(i)).toBeGreaterThanOrEqual(-5);expect(p.getX(i)).toBeLessThanOrEqual(5);
 }
 expect(seams).toBeGreaterThan(0);expect(Array.from(pit.getAttribute('position').array)).toEqual(before);
 [road,pit,joined].forEach(g=>g.dispose());
});
it('preserves grade-separated crossings rather than flattening them onto the road',()=>{
 const road=rectangle(-2,2,-10,10,.2),bridge=rectangle(-5,5,-3,3,5),joined=createPitRoadJoin(road)(bridge);
 expect(hits(joined,0,.37)[0].point.y).toBeCloseTo(5,6);
 [road,bridge,joined].forEach(g=>g.dispose());
});
it('also retains the racing verge continuously instead of leaving raised pit slivers over it',()=>{
 const road=rectangle(-2,2,-10,10,.2),verge=rectangle(2,3,-10,10,.22),pit=rectangle(-5,5,-3,3,.45),joined=createPitRoadJoin(road,verge)(pit);
 expect(hits(joined,2.5,.37)).toHaveLength(0);expect(hits(joined,4,.37)).not.toHaveLength(0);
 const p=joined.getAttribute('position');let count=0;
 for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-3)<1e-5){expect(p.getY(i)).toBeCloseTo(.22,6);count++}
 expect(count).toBeGreaterThan(0);[road,verge,pit,joined].forEach(g=>g.dispose());
});
it('removes the actual Montreal exit overlays found in both diagnostic photos',async()=>{
 const data=await loadCircuit('montreal'),g=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation),road=mapRoad(g,data.trackGeometry.widthMetres,.2),join=createPitRoadJoin(road.road,road.verge);
 const lane=data.facilities!.pitLanes.find(l=>l.id==='413000959')!,raw=pitLaneModel(data,g,lane).geometry,joined=join(raw);
 for(const distance of [551.7855555558851,572.6144444437807]){
  const p=g.at(distance),old=hits(raw,p.x,p.z)[0],main=hits(road.road,p.x,p.z)[0];
  expect(old.point.y-main.point.y).toBeGreaterThan(.08);
  expect(hits(joined,p.x,p.z)).toHaveLength(0);expect(main).toBeDefined();
 }
 [road.road,road.verge,raw,joined].forEach(g=>g.dispose());
});
