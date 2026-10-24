import {it,expect} from 'vitest';
import {loadCircuit,circuitRegistry} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {createSpectators} from '../src/circuits/spectators';
import {terrainHeight} from '../src/circuits/elevation';
import {spectatorTerrain} from '../src/circuits/spectatorTerrain';
import {terrainSpectatorZones} from '../src/circuits/spectatorDatum';

it('seating platforms and public-ground viewpoints stay above the rendered terrain across all 22 shared circuits',async()=>{
 for(const {circuitId:id} of circuitRegistry.filter(c=>c.circuitId!=='shanghai')){
  const d=await loadCircuit(id),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),grid=d.elevation.grid!;
  const zones=terrainSpectatorZones(d);
  const model=createSpectators(zones,g),[west,south,east,north]=grid.bounds,n=256;
  const factorX=111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration,factorZ=111320*g.calibration;
  const cell=Math.max((east-west)*factorX,(north-south)*factorZ)/n,cut=spectatorTerrain(d,g,cell);
  for(const surfaces of model.zoneSurfaces.values())for(const s of surfaces)for(const u of [.02,.5,.98])for(const v of [.01,.5,.99]){
   const floor=model.surfacePoint(s,u,v),lon=g.origin[0]+floor.x/factorX,lat=g.origin[1]-floor.z/factorZ;
   const column=Math.floor((lon-west)/(east-west)*n),row=Math.floor((lat-south)/(north-south)*n);
   const heights:number[]=[];
   for(const [dx,dz] of [[0,0],[0,1],[1,0],[1,1]]){
    const xLon=west+(east-west)*(column+dx)/n,zLat=south+(north-south)*(row+dz)/n,x=(xLon-g.origin[0])*factorX,z=-(zLat-g.origin[1])*factorZ;
    const raw=terrainHeight(d.elevation,xLon,zLat),display=cut(x,z,raw);
    expect(display,`${id}/${s.definition.surfaceId} raises DEM`).toBeLessThanOrEqual(raw+1e-8);
    heights.push(display-.3);
    if(!s.definition.terrainFollow)expect(display-.3,`${id}/${s.definition.surfaceId} terrain can cover seat`).toBeLessThanOrEqual(floor.y+.001);
   }
   if(s.definition.terrainFollow){
    // An uphill vertex is allowed above a downhill visitor. Test the actual
    // rendered ground triangle under the point, rather than flattening its hill.
    const u=(lon-west)/(east-west)*n-column,v=(lat-south)/(north-south)*n-row;
    const [h00,h01,h10,h11]=heights;
    const ground=u+v<=1?h00*(1-u-v)+h10*u+h01*v:h10*(1-v)+h01*(1-u)+h11*(u+v-1);
    expect(ground,`${id}/${s.definition.surfaceId} rendered terrain covers the public-ground surface`).toBeLessThanOrEqual(floor.y+.001);
   }
  }
 }
});
