import {it,expect} from 'vitest';
import {Vector2,Vector3} from 'three';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {geographicPoint,pitLaneModel} from '../src/circuits/facilityGeometry';
import {waterGeometry} from '../src/circuits/waterGeometry';
import {roadClearance,spectatorFence} from '../src/circuits/fenceGeometry';
import {terrainSpectatorZones} from '../src/circuits/spectatorDatum';
import {createSpectators} from '../src/circuits/spectators';

for(const [id,coordinate] of [
 ['monaco',[7.4265,43.7338]],['baku',[49.853,40.365]],['singapore',[103.858,1.286]],['melbourne',[144.9705,-37.846]]
] as const)it(`${id}: geographic water covers the real basin and preserves physical data`,async()=>{
 const d=await loadCircuit(id),snapshot=JSON.stringify(d),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),water=waterGeometry(d,g);
 const p=geographicPoint(g,coordinate),h=water.levelAt(p.x,p.z);
 expect(h).not.toBeNull();expect(Number.isFinite(h)).toBe(true);expect(water.geometry.getAttribute('position').count).toBeGreaterThan(3);
 if(id==='baku')expect(h!+d.elevation.grid!.referenceAltitude).toBeCloseTo(-29.4,3);
 expect(water.levelAt(1e8,1e8)).toBeNull();expect(JSON.stringify(d)).toBe(snapshot);
 for(const f of d.water!.features){expect(f.sources.length).toBeGreaterThan(0);expect(f.levelSource).toMatch(/^https:/);expect(f.levelEstimated).toBe(true);for(const ring of f.rings)expect(ring[0]).toEqual(ring.at(-1))}
 water.geometry.dispose();
});

it('Singapore connected reservoir has one estimated water datum and does not submerge any road edge',async()=>{
 const d=await loadCircuit('singapore'),snapshot=JSON.stringify(d),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),water=waterGeometry(d,g);
 const connected=d.water!.features.filter(f=>f.sources.some(s=>/\/(9542146|9569901)$/.test(s)));
 expect(connected).toHaveLength(2);expect(connected[0].altitudeMetres).toBe(connected[1].altitudeMetres);
 expect(connected.every(f=>f.levelEstimated&&f.hydrologySource==='https://www.pub.gov.sg/public/places-of-interest/marina-barrage')).toBe(true);
 let bridgePoints=0;
 for(let i=0;i<2400;i++){
  const s=i*g.length/2400,p=g.at(s),t=g.tangent(s),normal=new Vector3(-t.z,0,t.x).normalize();
  for(const side of [-1,0,1]){
   const q=p.clone().addScaledVector(normal,side*d.trackGeometry.widthMetres/2),level=water.levelAt(q.x,q.z);
   if(level!==null){bridgePoints++;expect(p.y+.2,`submerged road at ${s}`).toBeGreaterThan(level+.015)}
  }
 }
 expect(bridgePoints).toBeGreaterThan(100);expect(JSON.stringify(d)).toBe(snapshot);water.geometry.dispose();
});

it('water islands remain land and every water triangle stays horizontal',async()=>{
 const d=await loadCircuit('melbourne'),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation);
 const [x,z]=g.origin,ring=(s:number)=>[[x-s,z-s],[x+s,z-s],[x+s,z+s],[x-s,z+s],[x-s,z-s]] as [number,number][];
 const copy={...d,water:{...d.water!,features:[{...d.water!.features[0],rings:[ring(.001),ring(.0002)],altitudeMetres:3}]}};
 const w=waterGeometry(copy,g),center=geographicPoint(g,[x,z]),lake=geographicPoint(g,[x+.0007,z]);
 expect(w.levelAt(center.x,center.z)).toBeNull();expect(w.levelAt(lake.x,lake.z)).not.toBeNull();
 const p=w.geometry.getAttribute('position');for(let i=0;i<p.count;i+=3){expect(p.getY(i)).toBe(p.getY(i+1));expect(p.getY(i)).toBe(p.getY(i+2))}w.geometry.dispose();
});

for(const c of circuitRegistry.filter(c=>c.circuitId!=='shanghai'))it(`${c.circuitId}: estimated fence segments clear both racing surface and pit lane`,async()=>{
 const d=await loadCircuit(c.circuitId),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),model=createSpectators(terrainSpectatorZones(d),g),clear=roadClearance(d,g);
 for(const surfaces of model.zoneSurfaces.values())for(const s of surfaces){
  const lines=spectatorFence(s,model,d,g,clear);
  if(s.definition.baseReference)expect(lines).toHaveLength(0);
  for(const [a,b] of lines)for(let t=0;t<=1;t+=.1)expect(clear(new Vector3().lerpVectors(a,b,t))).toBeGreaterThanOrEqual(.69);
 }
});

it('Sepang F1 pit entry follows T15, excluding the South Circuit pit lane',async()=>{
 const d=await loadCircuit('sepang'),lanes=d.facilities!.pitLanes;
 expect(lanes.map(l=>l.id)).toEqual(['23410526','144359483']);
 expect(new Vector3(...[...lanes[0].coordinates.at(-1)!,0]).distanceTo(new Vector3(...[...lanes[1].coordinates[0],0]))).toBeLessThan(.00001);
});

for(const id of ['sepang','silverstone'])it(`${id}: estimated pit surface stops at the sourced garage wall`,async()=>{
 const d=await loadCircuit(id),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation);
 const cross=(a:Vector2,b:Vector2,c:Vector2)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const inside=(p:Vector2,r:Vector2[])=>{let hit=false;for(let i=0,j=r.length-1;i<r.length;j=i++)if((r[i].y>p.y)!==(r[j].y>p.y)&&p.x<(r[j].x-r[i].x)*(p.y-r[i].y)/(r[j].y-r[i].y)+r[i].x)hit=!hit;return hit};
 const crosses=(a:Vector2,b:Vector2,c:Vector2,d:Vector2)=>cross(a,b,c)*cross(a,b,d)<-1e-8&&cross(c,d,a)*cross(c,d,b)<-1e-8;
 for(const lane of d.facilities!.pitLanes.filter(l=>l.surfaceBoundary)){
  const model=pitLaneModel(d,g,lane),p=model.geometry.getAttribute('position');
  expect(model.points).toHaveLength(lane.coordinates.length);
  for(const b of d.facilities!.buildings){
   const ring=b.boundary.slice(0,-1).map(c=>{const q=geographicPoint(g,c);return new Vector2(q.x,q.z)});
   for(let i=0;i<p.count;i+=3){const t=[0,1,2].map(j=>new Vector2(p.getX(i+j),p.getZ(i+j)));
    expect(t.some(q=>inside(q,ring))).toBe(false);expect(ring.some(q=>inside(q,t))).toBe(false);
    expect(t.some((a,j)=>ring.some((c,k)=>crosses(a,t[(j+1)%3],c,ring[(k+1)%ring.length])))).toBe(false);
   }
  }model.geometry.dispose();
 }
});
