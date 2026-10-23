import type { Elevation } from "./types";
// Relative orthometric elevation; no fabricated banking or bridge clearance.
export function terrainHeight(elevation: Elevation | undefined, lon:number,lat:number) {
  const grid=elevation?.grid;
  if(!grid)return 0;
  const [west,south,east,north]=grid.bounds, n=grid.size;
  const x=Math.max(0,Math.min(n-1,(lon-west)/(east-west)*(n-1)));
  const z=Math.max(0,Math.min(n-1,(lat-south)/(north-south)*(n-1)));
  const i=Math.min(n-2,Math.floor(x)),j=Math.min(n-2,Math.floor(z)),u=x-i,v=z-j;
  const h=(a:number,b:number)=>grid.heights[b*n+a];
  return (h(i,j)*(1-u)+h(i+1,j)*u)*(1-v)+(h(i,j+1)*(1-u)+h(i+1,j+1)*u)*v-grid.referenceAltitude;
}
