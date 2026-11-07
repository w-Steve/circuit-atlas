/** Read-only earth-bank diagnosis; no visibility-fitted eye-height changes. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createCircuitContext} from '../src/app/CircuitContext';
import type {CircuitPackage} from '../src/circuits/types';
const raw=readFileSync('src/circuits/generated/suzuka.json','utf8'),data=JSON.parse(raw) as CircuitPackage;
const zone=data.spectatorZones.find(z=>z.zoneId==='west-j')!;
const context=createCircuitContext({...data,spectatorZones:data.spectatorZones.map(z=>z===zone?{...z,availability:'available'}:z)});
const samples=[];
const road=Array.from({length:1800},(_,i)=>context.geometry.at(i/1800*context.geometry.length));
for(const u of [.05,.25,.5,.75,.95])for(const v of [.05,.5,.95]){
 const selection={zoneId:zone.zoneId,tier:'lower' as const,u,v},eye=context.observer(selection),target=context.lookTarget(selection),length=eye.distanceTo(target);
 let worst={clearanceMetres:Infinity,fraction:0},firstBlockedFraction:number|null=null;
 for(let i=1;i<200;i++){
  const t=i/200,p=eye.clone().lerp(target,t),clearance=p.y-context.geometry.groundAt(p.x,p.z);
  // The displayed road corridor can cut the underlying terrain. Do not count
  // bare-earth samples inside it as evidence of an intervening bank.
  if(road.some(q=>(q.x-p.x)**2+(q.z-p.z)**2<(data.trackGeometry.widthMetres/2+2)**2))continue;
  if(clearance<worst.clearanceMetres)worst={clearanceMetres:clearance,fraction:t};
  if(clearance<0&&firstBlockedFraction===null)firstBlockedFraction=t;
 }
 samples.push({u,v,eye:eye.toArray(),target:target.toArray(),standingHeightMetres:eye.y-context.spectators.zonePoint(zone.zoneId,u,v,false).y,lengthMetres:length,worst,firstBlockedFraction});
}
mkdirSync('artifacts/goal-review/suzuka-j',{recursive:true});
const result={generatedSha256:createHash('sha256').update(raw).digest('hex'),scope:'Current source-ground line sampling to initial look target; not an independent geographic or all-direction visibility certificate.',samples};
writeFileSync('artifacts/goal-review/suzuka-j/ground-lines.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({samples:samples.length,blocked:samples.filter(s=>s.firstBlockedFraction!==null).length,minStandingHeight:Math.min(...samples.map(s=>s.standingHeightMetres)),maxStandingHeight:Math.max(...samples.map(s=>s.standingHeightMetres)),deepestGroundPenetrationMetres:Math.max(0,...samples.map(s=>-s.worst.clearanceMetres))}));
