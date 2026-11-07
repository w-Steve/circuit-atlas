import {it,expect} from 'vitest';
import {Vector3} from 'three';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {barrierGeometry} from '../src/circuits/barrierGeometry';
import {geographicPoint} from '../src/circuits/facilityGeometry';
import {roadClearance,spectatorFence} from '../src/circuits/fenceGeometry';

it('seven source-height Monza fences retain road clearance and real ground levels',async()=>{
 const d=await loadCircuit('monza'),r=createCircuitContext(d),clearance=roadClearance(d,r.geometry),barriers=d.facilities!.barriers!;
 expect(barriers).toHaveLength(7);let length=0,minClearance=Infinity;
 for(const b of barriers){
  expect(b.heightMetres).toBe(3);expect(b.source.method).toBe('extracted');expect(b.source.notes).toContain('not a certified 2026');
  const points=b.coordinates.map(c=>geographicPoint(r.geometry,c));
  for(let i=0;i<points.length-1;i++){
   const a=points[i],q=points[i+1],metres=Math.hypot(q.x-a.x,q.z-a.z);length+=metres;
   const count=Math.ceil(metres/.25);for(let j=0;j<=count;j++)minClearance=Math.min(minClearance,clearance(a.clone().lerp(q,j/count)));
  }
 }
 expect(length).toBeGreaterThan(1700);expect(length).toBeLessThan(1715);expect(minClearance).toBeGreaterThan(4.5);
 const model=barrierGeometry(d,r.geometry),positions=model.wires.getAttribute('position');
 expect(model.posts.length).toBeGreaterThan(420);expect(model.posts.length).toBeLessThan(450);
 expect(positions.count).toBeGreaterThan(100000);expect(positions.count).toBeLessThan(200000);
 for(const p of model.posts){expect(p.height).toBe(3);expect(p.position.y).toBeCloseTo(r.geometry.groundAt(p.position.x,p.position.z),8)}
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),h=y-r.geometry.groundAt(x,z);
  expect(h).toBeGreaterThan(-.002);expect(h).toBeLessThan(3.002);
 }
 model.wires.dispose();
});

it('barrier construction does not mutate source or another circuit context',async()=>{
 const d=await loadCircuit('monza'),a=createCircuitContext(d),b=createCircuitContext(await loadCircuit('shanghai')),before=JSON.stringify(d);
 const eye=b.observer(b.store.getState().selection),model=barrierGeometry(d,a.geometry),other=barrierGeometry(b.data,b.geometry);
 expect(other.posts).toHaveLength(0);expect(other.wires.getAttribute('position').count).toBe(0);
 expect(JSON.stringify(d)).toBe(before);expect(b.observer(b.store.getState().selection).distanceTo(eye)).toBe(0);
 expect(model.posts[0].position).toBeInstanceOf(Vector3);model.wires.dispose();other.wires.dispose();
});

it('sourced Vedano fence replaces its nearby estimated proxy rather than doubling it',async()=>{
 const d=await loadCircuit('monza'),r=createCircuitContext(d),surface=r.spectators.zoneSurfaces.get('vedano')![0];
 const withoutSources={...d,facilities:{...d.facilities!,barriers:[]}};
 expect(spectatorFence(surface,r.spectators,withoutSources,r.geometry,r.clearance()).length).toBeGreaterThan(60);
 expect(spectatorFence(surface,r.spectators,d,r.geometry,r.clearance())).toHaveLength(0);
 expect(d.facilities!.barriers).toHaveLength(7);
});
