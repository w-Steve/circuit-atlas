/** Read-only current geometry export; does not regenerate packages or alter availability. */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createCircuitGeometry} from '../src/circuits/geometry';
import {mapRoad} from '../src/circuits/mapRoad';
import {europeanCircuits,asiaPacificCircuits,americanCircuits} from '../src/circuits/regions';
const ids=[...europeanCircuits,...asiaPacificCircuits,...americanCircuits];
if(ids.length!==23||new Set(ids).size!==23)throw Error('Expected 23 independent venues');
const out='artifacts/goal-review/season-spatial';mkdirSync(out,{recursive:true});
for(const id of ids){
 const raw=readFileSync(`src/circuits/generated/${id}.json`,'utf8'),data=JSON.parse(raw);
 const g=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
 const mesh=mapRoad(g,data.trackGeometry.widthMetres),p=mesh.road.getAttribute('position'),idx=mesh.road.index!;
 const triangles=[];
 for(let i=0;i<idx.count;i+=3)triangles.push([0,1,2].map(j=>{const k=idx.getX(i+j);return [p.getX(k),p.getZ(k)]}));
 const scenePath=`src/circuits/scenes/${id}.json`;
 const sceneSha256=existsSync(scenePath)?createHash('sha256').update(readFileSync(scenePath)).digest('hex'):null;
 writeFileSync(`${out}/${id}.json`,JSON.stringify({id,packageSha256:createHash('sha256').update(raw).digest('hex'),sceneSha256,origin:g.origin,calibration:g.calibration,triangles}));
 mesh.road.dispose();mesh.verge.dispose();
}
console.log(`Exported ${ids.length} current road meshes, read-only.`);
