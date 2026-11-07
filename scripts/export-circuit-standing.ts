// Export the same metric road used by the shared viewer for offline source QA.
import {mkdirSync,writeFileSync} from 'node:fs';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {mapRoad} from '../src/circuits/mapRoad';
const id=process.argv[2];if(!id)throw Error('Expected a registered circuit ID');
const data=await loadCircuit(id),g=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation),m=mapRoad(g,data.trackGeometry.widthMetres),p=m.road.getAttribute('position'),indices=m.road.index!;
mkdirSync('artifacts/goal-review',{recursive:true});
writeFileSync(`artifacts/goal-review/${data.circuitId}-standing-metric.json`,JSON.stringify({inputs:{trackGeometry:data.trackGeometry,corners:data.corners,elevation:data.elevation},origin:g.origin,calibration:g.calibration,road:Array.from({length:4000},(_,i)=>{const p=g.at(i*g.length/4000);return[p.x,p.z]}),triangles:Array.from({length:indices.count/3},(_,i)=>[0,1,2].map(j=>{const k=indices.getX(i*3+j);return[p.getX(k),p.getZ(k)]}))}));
m.road.dispose();m.verge.dispose();
