import {mkdirSync,writeFileSync} from 'node:fs';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {mapRoad} from '../src/circuits/mapRoad';
const d=await loadCircuit('madrid'),g=createCircuitGeometry(d.trackGeometry.coordinates,d.lengthMetres,d.elevation),m=mapRoad(g,d.trackGeometry.widthMetres),p=m.road.getAttribute('position'),ix=m.road.index!;
mkdirSync('artifacts/goal-review/madrid-main',{recursive:true});
writeFileSync('artifacts/goal-review/madrid-main/metric.json',JSON.stringify({inputs:{trackGeometry:d.trackGeometry,corners:d.corners,elevation:d.elevation},origin:g.origin,calibration:g.calibration,road:Array.from({length:4000},(_,i)=>g.at(i*g.length/4000).toArray()),triangles:Array.from({length:ix.count/3},(_,i)=>[0,1,2].map(j=>{const k=ix.getX(i*3+j);return[p.getX(k),p.getZ(k)]}))}));m.road.dispose();m.verge.dispose();
