import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {mapRoad} from '../src/circuits/mapRoad';
import {europeanCircuits,asiaPacificCircuits,americanCircuits} from '../src/circuits/regions';
const region=['asia','americas'].includes(process.argv[2])?process.argv[2]:'europe',destination=region==='europe'?'artifacts/map-audit':`artifacts/${region}-spectators`;
mkdirSync(destination,{recursive:true});
const ids=region==='americas'?americanCircuits:region==='asia'?asiaPacificCircuits.filter(id=>id!=='shanghai'):europeanCircuits;
const records=ids.map(id=>{
  const data=JSON.parse(readFileSync(`src/circuits/generated/${id}.json`,'utf8'));
  const g=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
  const mesh=mapRoad(g,data.trackGeometry.widthMetres),positions=mesh.road.getAttribute('position');
  const triangles=[];
  for(let i=0;i<mesh.road.index!.count;i+=3)triangles.push([0,1,2].map(j=>{const k=mesh.road.index!.getX(i+j);return [positions.getX(k),positions.getZ(k)]}));
  const road=Array.from({length:4000},(_,i)=>g.at(i*g.length/4000).toArray());
  mesh.road.dispose();mesh.verge.dispose();
  return {id,origin:g.origin,calibration:g.calibration,triangles,road};
});
writeFileSync(`${destination}/metric-geometry.json`,JSON.stringify(records));
