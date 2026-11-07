// Candidate-only geometry report; never writes runtime circuit packages.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {buildingModel,pitLaneModel} from '../src/circuits/facilityGeometry';
import {mapRoad} from '../src/circuits/mapRoad';
const candidate=JSON.parse(readFileSync('src/circuits/elevation-source/candidates/silverstone-ea-dtm.json','utf8'));
const data=structuredClone(await loadCircuit('silverstone'));
const baseline=createCircuitContext(data);
if(process.argv.includes('--front-datum')){
 const source=JSON.parse(readFileSync('src/circuits/europe/silverstone-copse-d-datum-2026.json','utf8'));
 data.spectatorZones.find(z=>z.zoneId===source.zoneId)!.surfaces![0].groundReference=source.groundReference;
}
data.elevation={...data.elevation,grid:candidate.grid};
if(process.argv.includes('--drape-facilities')){
 data.facilities?.pitLanes.forEach(l=>l.terrainMeshSpacingMetres=2);
 data.facilities?.buildings.forEach(b=>b.foundationToTerrain=true);
}
const rt=createCircuitContext(data),g=rt.geometry;
let maxGrade=0,maxRoadDelta=0;
for(let i=0;i<5451;i++){
 const a=g.at(i),b=g.at(i+1);
 maxGrade=Math.max(maxGrade,Math.abs(b.y-a.y)/Math.hypot(b.x-a.x,b.z-a.z));
 maxRoadDelta=Math.max(maxRoadDelta,Math.abs(a.y-g.groundAt(a.x,a.z)));
}
const zones=rt.spectators.spectatorZones.map(z=>{
 let minFloorAboveGround=Infinity,minEyeAboveFloor=Infinity,baselineMinFloorAboveGround=Infinity,minAt:{u:number;v:number}|null=null;
 for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const u=.001+.998*i/20,v=.001+.998*j/20;
  const floor=rt.spectators.zonePoint(z.zoneId,u,v,false),eye=rt.spectators.zonePoint(z.zoneId,u,v,true);
  const clearance=floor.y-g.groundAt(floor.x,floor.z);
  if(clearance<minFloorAboveGround){minFloorAboveGround=clearance;minAt={u,v}}
  minEyeAboveFloor=Math.min(minEyeAboveFloor,eye.y-floor.y);
  const old=baseline.spectators.zonePoint(z.zoneId,u,v,false);
  baselineMinFloorAboveGround=Math.min(baselineMinFloorAboveGround,old.y-baseline.geometry.groundAt(old.x,old.z));
 }
 return {zoneId:z.zoneId,minFloorAboveGround,baselineMinFloorAboveGround,minEyeAboveFloor,minAt};
});
const requiresFoundationReview=zones.filter(z=>z.minFloorAboveGround<0);
let maxPitTerrainPenetration=0,minPitClearance=Infinity,pitSamples=0;
for(const lane of data.facilities?.pitLanes??[]){
 const {geometry:mesh}=pitLaneModel(data,g,lane),p=mesh.getAttribute('position');
 for(let i=0;i<(mesh.index?.count??p.count);i+=3){
  const ids=[0,1,2].map(j=>mesh.index?mesh.index.getX(i+j):i+j);
  for(let a=0;a<=10;a++)for(let b=0;b<=10-a;b++){
   const weights=[a/10,b/10,1-a/10-b/10],xyz=[0,1,2].map(dim=>ids.reduce((sum,k,j)=>sum+weights[j]*p.getComponent(k,dim),0));
   const clearance=xyz[1]-g.groundAt(xyz[0],xyz[2]);
   minPitClearance=Math.min(minPitClearance,clearance);maxPitTerrainPenetration=Math.max(maxPitTerrainPenetration,-clearance);pitSamples++;
  }
 }
 mesh.dispose();
}
const buildings=(data.facilities?.buildings??[]).map(b=>{
 const model=buildingModel(data,g,b),gaps=model.points.map(p=>model.base-g.groundAt(p.x,p.z));
 model.walls.dispose();model.roof.dispose();
 return {name:b.name,foundationExtensionAtCornersMetres:Math.max(...gaps),foundationClosedToTerrain:!!b.foundationToTerrain,heightMetres:model.height};
});
const report={candidateOnly:!candidate.runtimeApplied,sceneAccepted:!!candidate.sceneAcceptance.accepted,samplesPerZone:441,maxGrade,maxRoadDelta,zones,requiresFoundationReview,
 facilities:{pitSamples,minPitClearance,maxPitTerrainPenetration,buildings},
 limits:'Clearances use uncut bare-earth DEM, not display foundation cuts. Negative clearance requires source/structure review; it is not by itself proof of actual rendered penetration or a reason to raise eyes.'};
mkdirSync('artifacts/goal-review/silverstone-ea',{recursive:true});
writeFileSync('artifacts/goal-review/silverstone-ea/geometry.json',JSON.stringify(report,null,2));
const road=mapRoad(g,data.trackGeometry.widthMetres),p=road.road.getAttribute('position'),index=road.road.index!;
const horizontal=(c:number[])=>[(c[0]-g.origin[0])*111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration,-(c[1]-g.origin[1])*111320*g.calibration];
const pits=data.facilities!.pitLanes.flatMap(l=>{
 const {geometry:mesh}=pitLaneModel(data,g,{...l,terrainMeshSpacingMetres:undefined}),p=mesh.getAttribute('position');
 const triangles=Array.from({length:(mesh.index?.count??p.count)/3},(_,i)=>[0,1,2].map(j=>{const k=mesh.index?mesh.index.getX(i*3+j):i*3+j;return[p.getX(k),p.getZ(k)]}));mesh.dispose();return triangles;
});
writeFileSync('artifacts/goal-review/silverstone-ea/footprints.json',JSON.stringify({
 roads:Array.from({length:index.count/3},(_,i)=>[0,1,2].map(j=>{const k=index.getX(i*3+j);return[p.getX(k),p.getZ(k)]})),
 zones:data.spectatorZones.filter(z=>z.availability==='available').map(z=>({id:z.zoneId,boundary:z.boundary.map(horizontal)})),
 pits,buildings:data.facilities!.buildings.map(b=>b.boundary.map(horizontal))}));
road.road.dispose();road.verge.dispose();
console.log(JSON.stringify({maxGrade,maxRoadDelta,zones:zones.length,buriedZones:zones.filter(z=>z.minFloorAboveGround<0),facilities:report.facilities}));
if(process.argv.includes('--require-clearance')&&requiresFoundationReview.length)throw Error('EA terrain acceptance requires unresolved foundation review');
