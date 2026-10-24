import type {Vector3} from 'three';

/** Periodic, distance-weighted Gaussian interpolation of a coarse DTM profile.
 * Return new heights; leave the retained source and horizontal road untouched.
 * This is an estimate, not a surveyed road or a height-exaggeration control. */
export function smoothRoadHeights(points:readonly Vector3[],sigma:number){
 if(!Number.isFinite(sigma)||sigma<=0)throw Error('Invalid road smoothing distance');
 const n=points.length;if(n<3)throw Error('Incomplete road profile');
 const steps=points.map((p,i)=>Math.hypot(p.x-points[(i+1)%n].x,p.z-points[(i+1)%n].z));
 return points.map((p,i)=>{
  let sum=p.y,weight=1;
  for(const direction of [-1,1]){
   let distance=0,index=i;
   for(let j=1;j<n;j++){
    distance+=steps[direction===1?index:(index+n-1)%n];index=(index+direction+n)%n;
    if(distance>sigma*3)break;
    const w=Math.exp(-.5*(distance/sigma)**2);sum+=points[index].y*w;weight+=w;
   }
  }
  return sum/weight;
 });
}
