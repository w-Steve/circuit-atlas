import { useEffect, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute,Color,CanvasTexture,LinearFilter } from "three";
import type { CircuitPackage } from "../circuits/types";
import type { createCircuitGeometry } from "../circuits/geometry";
import { terrainHeight } from "../circuits/elevation";
import {roadTerrain} from '../circuits/roadTerrain';
import {spectatorTerrain,type TerrainFoundation} from '../circuits/spectatorTerrain';
import {waterGeometry} from '../circuits/waterGeometry';
import {cutPublicGround} from '../circuits/publicGroundCut';
import {useThree} from '@react-three/fiber';
const noFoundations:readonly TerrainFoundation[]=[];
export function Terrain({data,geometry,colored=false,foundations=noFoundations}:{data:CircuitPackage;geometry:ReturnType<typeof createCircuitGeometry>;colored?:boolean;foundations?:readonly TerrainFoundation[]}){
  const {gl}=useThree();
  const water=useMemo(()=>waterGeometry(data,geometry),[data,geometry]);
  useEffect(()=>{
    gl.domElement.dataset.waterFeatures=String(water.featureCount);
    gl.domElement.dataset.terrainSamples=String(data.elevation.grid?.heights.length??0);
    gl.domElement.dataset.terrainColored=String(colored);
  },[gl,water,data,colored]);
  useEffect(()=>()=>water.geometry.dispose(),[water]);
  const waterMask=useMemo(()=>{
    if(!water.featureCount||!data.elevation.grid)return null;
    const [w,s,e,n]=data.elevation.grid.bounds,canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='black';ctx.fillRect(0,0,1024,1024);ctx.fillStyle='white';
    for(const f of data.water!.features){ctx.beginPath();for(const ring of f.rings){ring.forEach(([lon,lat],i)=>{const x=(lon-w)/(e-w)*1024,y=(n-lat)/(n-s)*1024;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.closePath()}ctx.fill('evenodd')}
    const texture=new CanvasTexture(canvas);texture.minFilter=texture.magFilter=LinearFilter;texture.generateMipmaps=false;return texture;
  },[data,water]);
  useEffect(()=>()=>waterMask?.dispose(),[waterMask]);
  const mesh=useMemo(()=>{
    if(!data.elevation.grid)return null;
    const {bounds}=data.elevation.grid,[west,south,east,north]=bounds,n=256;
    const cellMetres=Math.max((east-west)*111320*Math.cos(geometry.origin[1]*Math.PI/180),(north-south)*111320)*geometry.calibration/n;
    const cut=roadTerrain(data,geometry,cellMetres);
    const foundationCut=spectatorTerrain(data,geometry,cellMetres,foundations);
    const vertices:number[]=[],indices:number[]=[],colors:number[]=[],uvs:number[]=[];
    const lo=Math.min(...data.elevation.grid.heights)-data.elevation.grid.referenceAltitude,hi=Math.max(...data.elevation.grid.heights)-data.elevation.grid.referenceAltitude;
    const lowColor=new Color('#30473f'),highColor=new Color('#687b68'),color=new Color();
    for(let r=0;r<=n;r++)for(let c=0;c<=n;c++){
      const lon=west+(east-west)*c/n,lat=south+(north-south)*r/n;
      uvs.push(c/n,r/n);
      const h=terrainHeight(data.elevation,lon,lat);color.copy(lowColor).lerp(highColor,(h-lo)/Math.max(1,hi-lo));colors.push(color.r,color.g,color.b);
      const x=(lon-geometry.origin[0])*111320*Math.cos(geometry.origin[1]*Math.PI/180)*geometry.calibration,z=-(lat-geometry.origin[1])*111320*geometry.calibration;
      const level=water.levelAt(x,z);
      vertices.push(x,Math.min(foundationCut(x,z,cut(x,z,h)),level===null?Infinity:level-.2)-.3,z);
      if(r<n&&c<n){const a=r*(n+1)+c;indices.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1)}
    }
    const clipped=cutPublicGround(data,geometry,vertices,indices,colors,uvs);
    const result=new BufferGeometry();result.setAttribute('position',new Float32BufferAttribute(vertices,3));result.setAttribute('uv',new Float32BufferAttribute(uvs,2));result.setAttribute("color",new Float32BufferAttribute(colors,3));result.setIndex(clipped);result.computeVertexNormals();return result;
  },[data,geometry,water,foundations]);
  useEffect(()=>()=>mesh?.dispose(),[mesh]);
  return mesh?<><mesh geometry={mesh}><meshStandardMaterial key={`${colored}-${water.featureCount>0}`} customProgramCacheKey={()=>`terrain-${colored}-${Boolean(waterMask)}`} color={colored?'#ffffff':'#43594f'} vertexColors={colored} roughness={1} side={2} onBeforeCompile={shader=>{
    if(waterMask){
      shader.uniforms.waterMask={value:waterMask};
      shader.vertexShader='varying vec2 waterUv;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterUv=uv;');
      shader.fragmentShader='uniform sampler2D waterMask; varying vec2 waterUv;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(texture2D(waterMask,waterUv).r>.5)discard;');
    }
    if(!colored)return;
    shader.vertexShader='varying float terrainY;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nterrainY=position.y;');
    shader.fragmentShader='varying float terrainY;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      ${colored?`float h=(terrainY+.3)/5.;
      float edge=abs(fract(h+.5)-.5)/max(fwidth(h),.001);
      float major=abs(fract(h/5.+.5)-.5)/max(fwidth(h/5.),.001);
      float lines=(1.-smoothstep(.2,.85,edge))*.10+(1.-smoothstep(.3,1.,major))*.12;
      diffuseColor.rgb*=1.-lines;`:''}
    `);
  }}/></mesh>{water.featureCount>0&&<mesh geometry={water.geometry} name="geographic-water" userData={{waterFeatures:water.featureCount}}><meshStandardMaterial color="#376a7c" roughness={.38} metalness={.1} side={2}/></mesh>}</>:null;
}
