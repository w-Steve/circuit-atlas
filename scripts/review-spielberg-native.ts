// Export the current rendered road for a read-only native-footprint review.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {mapRoad} from '../src/circuits/mapRoad';
import {pitLaneModel} from '../src/circuits/facilityGeometry';
const raw=readFileSync('src/circuits/generated/spielberg.json','utf8'),data=JSON.parse(raw);
const geometry=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
const mesh=mapRoad(geometry,data.trackGeometry.widthMetres),p=mesh.road.getAttribute('position'),triangles=[];
for(let i=0;i<mesh.road.index!.count;i+=3)triangles.push([0,1,2].map(j=>{const k=mesh.road.index!.getX(i+j);return [p.getX(k),p.getZ(k)]}));
mkdirSync('artifacts/goal-review/spielberg-native',{recursive:true});
writeFileSync('artifacts/goal-review/spielberg-native/road.json',JSON.stringify({generatedSha256:createHash('sha256').update(raw).digest('hex'),origin:geometry.origin,calibration:geometry.calibration,triangles}));
const facilitiesRaw=readFileSync('src/circuits/facilities/spielberg.json','utf8'),facilities=JSON.parse(facilitiesRaw);
const pitTriangles=facilities.pitLanes.flatMap((lane:any)=>{
 const mesh=pitLaneModel({...data,facilities},geometry,lane).geometry,p=mesh.getAttribute('position'),out=[];
 for(let i=0;i<(mesh.index?.count??p.count);i+=3)out.push([0,1,2].map(j=>{const k=mesh.index?.getX(i+j)??i+j;return [p.getX(k),p.getZ(k)]}));
 mesh.dispose();return out;
});
writeFileSync('artifacts/goal-review/spielberg-native/facilities.json',JSON.stringify({generatedSha256:createHash('sha256').update(raw).digest('hex'),facilitiesSha256:createHash('sha256').update(facilitiesRaw).digest('hex'),pitTriangles}));
mesh.road.dispose();mesh.verge.dispose();
console.log(`Spielberg: exported ${triangles.length} current road triangles; runtime unchanged.`);
