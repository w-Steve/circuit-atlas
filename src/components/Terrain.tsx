import { useEffect, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute,Color } from "three";
import type { CircuitPackage } from "../circuits/types";
import type { createCircuitGeometry } from "../circuits/geometry";
import { terrainHeight } from "../circuits/elevation";
export function Terrain({data,geometry,colored=false}:{data:CircuitPackage;geometry:ReturnType<typeof createCircuitGeometry>;colored?:boolean}){
  const mesh=useMemo(()=>{
    if(!data.elevation.grid)return null;
    const {bounds}=data.elevation.grid,[west,south,east,north]=bounds,n=192;
    const vertices:number[]=[],indices:number[]=[],colors:number[]=[];
    const lo=Math.min(...data.elevation.grid.heights)-data.elevation.grid.referenceAltitude,hi=Math.max(...data.elevation.grid.heights)-data.elevation.grid.referenceAltitude;
    for(let r=0;r<=n;r++)for(let c=0;c<=n;c++){
      const lon=west+(east-west)*c/n,lat=south+(north-south)*r/n;
      const h=terrainHeight(data.elevation,lon,lat),color=new Color('#30473f').lerp(new Color('#687b68'),(h-lo)/Math.max(1,hi-lo));colors.push(color.r,color.g,color.b);
      vertices.push((lon-geometry.origin[0])*111320*Math.cos(geometry.origin[1]*Math.PI/180)*geometry.calibration,terrainHeight(data.elevation,lon,lat)-.3,-(lat-geometry.origin[1])*111320*geometry.calibration);
      if(r<n&&c<n){const a=r*(n+1)+c;indices.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1)}
    }
    const result=new BufferGeometry();result.setAttribute('position',new Float32BufferAttribute(vertices,3));result.setAttribute("color",new Float32BufferAttribute(colors,3));result.setIndex(indices);result.computeVertexNormals();return result;
  },[data,geometry]);
  useEffect(()=>()=>mesh?.dispose(),[mesh]);
  return mesh?<mesh geometry={mesh}><meshStandardMaterial key={String(colored)} color={colored?'#ffffff':'#43594f'} vertexColors={colored} roughness={1} side={2} onBeforeCompile={shader=>{
    if(!colored)return;
    shader.vertexShader='varying float terrainY;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nterrainY=position.y;');
    shader.fragmentShader='varying float terrainY;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      ${colored?`float h=(terrainY+.3)/5.;
      float edge=abs(fract(h+.5)-.5)/max(fwidth(h),.001);
      float major=abs(fract(h/5.+.5)-.5)/max(fwidth(h/5.),.001);
      float lines=(1.-smoothstep(.2,.85,edge))*.10+(1.-smoothstep(.3,1.,major))*.12;
      diffuseColor.rgb*=1.-lines;`:''}
    `);
  }}/></mesh>:null;
}
