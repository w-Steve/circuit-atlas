import {Vector3} from 'three';
import type {CircuitPackage,CircuitTiming} from './types';
import type {createCircuitGeometry} from './geometry';
import {createSpectators} from './spectators';
import {geographicPoint} from './facilityGeometry';

/** Factual FIA distances + explicit approximate diagram/GIS registration.
 * A similarity transform preserves bearings and scale; no per-line relocation
 * to improve a screenshot. All rendered marks are snapped to the real road. */
export function resolveTiming(data:CircuitPackage,g:ReturnType<typeof createCircuitGeometry>,source:CircuitTiming){
 if(source.circuitId!==data.circuitId)throw Error('Timing package mismatch');
 const pairs=source.cornerLabels.map(label=>{
  const corner=data.corners.find(c=>c.number===label.number);if(!corner)throw Error('Unknown timing corner');
  const p=geographicPoint(g,corner.coordinate);return {x:label.point[0],z:label.point[1],world:p};
 });
 const n=pairs.length;if(n<3)throw Error('Incomplete timing registration');
 const mean=pairs.reduce((v,p)=>({x:v.x+p.x/n,z:v.z+p.z/n,X:v.X+p.world.x/n,Z:v.Z+p.world.z/n}),{x:0,z:0,X:0,Z:0});
 let denominator=0,a=0,b=0;
 for(const p of pairs){const x=p.x-mean.x,z=p.z-mean.z,X=p.world.x-mean.X,Z=p.world.z-mean.Z;denominator+=x*x+z*z;a+=x*X+z*Z;b+=x*Z-z*X}
 if(denominator<1)throw Error('Degenerate timing registration');a/=denominator;b/=denominator;
 const project=([x,z]:readonly number[])=>new Vector3(mean.X+a*(x-mean.x)-b*(z-mean.z),0,mean.Z+b*(x-mean.x)+a*(z-mean.z));
 const rms=Math.sqrt(pairs.reduce((sum,p)=>sum+project([p.x,p.z]).setY(p.world.y).distanceToSquared(p.world),0)/n);
 const nearest=createSpectators([],g).nearestTrack,wrap=(s:number)=>((s%g.length)+g.length)%g.length;
 const start=nearest(project(source.diagramMarks.start)).distance,control=nearest(project(source.diagramMarks.control)).distance;
 const anchors=source.splitAnchors.map(ref=>{
  const corner=data.corners.find(c=>c.number===ref.corner);if(!corner)throw Error('Missing FIA intermediate corner');
  if(ref.reference==='entry'){
   if(!ref.diagramPoint)throw Error('Missing entry timing diagram position');
   return nearest(project(ref.diagramPoint)).distance;
  }
  return wrap(nearest(geographicPoint(g,corner.coordinate)).distance+ref.offsetMetres);
 });
 const lengths=source.sectorLengthsMetres;
 const lengthMismatchMetres=lengths?lengths.reduce((s,v)=>s+v,0)-g.length:0;
 // Austria's 2026 FIA sheet totals 4326m; the retained F1 fact is 4318m.
 // Keep both facts, never stretch the car's physical route to hide that conflict.
 if(Math.abs(lengthMismatchMetres)>15)throw Error('FIA timing length does not match this layout');
 // The FIA describes each timing loop relative to a named physical corner.
 // Use those local anchors on this GIS layout. Applying published sector
 // lengths from an approximate registered finish can drift to a different turn
 // (notably Austin); retain the official lengths separately as reference facts.
 const splits=anchors;
 const sectorAt=(s:number)=>{const u=wrap(s-control),first=wrap(splits[0]-control),second=wrap(splits[1]-control);return u<first?0:u<second?1:2};
 if(!(wrap(splits[0]-control)>0&&wrap(splits[1]-control)>wrap(splits[0]-control)))throw Error('Invalid timing sector order');
 return {start,control,splits,sectorAt,registrationRmsMetres:rms,lengthMismatchMetres,source,
  publishedLengthResiduals:lengths?anchors.map((s,i)=>{const expected=wrap(control+lengths.slice(0,i+1).reduce((a,b)=>a+b,0)),delta=wrap(expected-s);return Math.min(delta,g.length-delta)}):[]};
}
