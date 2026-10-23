import { useEffect, useMemo, useState } from "react";
import { Html } from "@react-three/drei";
import { BufferGeometry,Float32BufferAttribute,Vector3 } from "three";
import * as shanghaiSpectators from "../circuits/shanghai/spectators";
import {circuitRuntime} from "../circuits/runtime";
import type { SpectatorSurface } from "../circuits/shanghai/spectators";
import { useApp } from "../store";
import { SelectionPoint } from "./SelectionPoint";
import {terrainHeight} from '../circuits/elevation';

function Fence({surface}:{surface:SpectatorSurface}){
  const {surfacePoint}=circuitRuntime.current?.spectators??shanghaiSpectators;
  const geometry=useMemo(()=>{
    const points:number[]=[];
    const front=Array.from({length:25},(_,i)=>{
      const p=surfacePoint(surface,i/24,0),back=surfacePoint(surface,i/24,1);
      const toward=new Vector3().subVectors(p,back).setY(0).normalize();
      return p.addScaledVector(toward,4).setY(circuitRuntime.current?p.y-surface.zone.surface.baseHeight+.1:.1);
    });
    for(let i=0;i<24;i++){
      for(const h of [0,.55,1.1,1.65,2.2,2.75,3.3])points.push(front[i].x,front[i].y+h,front[i].z,front[i+1].x,front[i+1].y+h,front[i+1].z);
      points.push(front[i].x,front[i].y,front[i].z,front[i].x,front[i].y+3.5,front[i].z);
      // Diagonal wire geometry participates in the real camera depth test.
      const count=Math.max(1,Math.ceil(front[i].distanceTo(front[i+1])/.6));
      for(let cell=0;cell<count;cell++){
        const a=front[i].clone().lerp(front[i+1],cell/count),b=front[i].clone().lerp(front[i+1],(cell+1)/count);
        for(let h=0;h+.3<=3.3;h+=.3)points.push(a.x,a.y+h,a.z,b.x,b.y+h+.3,b.z,a.x,a.y+h+.3,a.z,b.x,b.y+h,b.z);
      }
    }
    const result=new BufferGeometry();result.setAttribute('position',new Float32BufferAttribute(points,3));return result;
  },[surface]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <lineSegments geometry={geometry}><lineBasicMaterial color="#263b32" transparent opacity={.92}/></lineSegments>;
}
function AreaSurface({surface,highlight,onHover}:{surface:SpectatorSurface;highlight:boolean;onHover:(zone:string)=>void}){
  const {surfaceGeometry,selectionAt}=circuitRuntime.current?.spectators??shanghaiSpectators;
  const mode=useApp(s=>s.mode);
  const geometry=useMemo(()=>{
    const runtime=circuitRuntime.current;
    if(!runtime||!surface.zone.supportToTerrain)return surfaceGeometry(surface);
    const {origin,calibration}=runtime.geometry;
    return surfaceGeometry(surface,p=>terrainHeight(runtime.data.elevation,
      origin[0]+p.x/(111320*Math.cos(origin[1]*Math.PI/180)*calibration),origin[1]-p.y/(111320*calibration))-.15);
  },[surface]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  const select=(p:Vector3)=>{
    const app=useApp.getState();app.chooseZone(surface.zone.zoneId);app.select(selectionAt(surface,p));app.setMode('select');
  };
  return <>
    <mesh geometry={geometry} userData={{spectatorSurface:surface}}
      onPointerOver={e=>{if(mode==='overview'||mode==='select'){e.stopPropagation();onHover(surface.zone.zoneId)}}}
      onPointerOut={()=>onHover('')}
      onClick={e=>{
        if(mode==='eye'||mode==='phone'||e.delta>4)return;
        e.stopPropagation();select(e.point);
      }}
>
      <meshStandardMaterial color={highlight?'#d46750':surface.zone.kind==='grass'?'#607854':'#8d9690'} roughness={.95} side={2}/>
    </mesh>
    <Fence surface={surface}/>
  </>;
}
export function SpectatorAreas({active=true}:{active?:boolean}){
  const runtime=circuitRuntime.current;
  const {zoneSurfaces,spectatorZones,zonePoint}=runtime?.spectators??shanghaiSpectators;
  const mode=useApp(s=>s.mode),zone=useApp(s=>s.selection.zoneId??'a');


  const [hover,setHover]=useState('');
  return <>
    {active&&mode==='select'&&<SelectionPoint/>}
    {[...zoneSurfaces].filter(([id])=>runtime||id!=='a').flatMap(([id,surfaces])=>surfaces.map(s=><AreaSurface key={s.definition.surfaceId} surface={s} highlight={hover===id||(mode==='select'&&zone===id)} onHover={setHover}/>))}
    {active&&mode==='overview'&&spectatorZones.filter(z=>runtime||z.zoneId!=='a').map(z=><Html key={z.zoneId} portal={{current:document.getElementById('scene-labels')!}} position={zonePoint(z.zoneId,.5,.5).add(new Vector3(0,25,0))} center>
      <button className="marker zone-marker" data-zone={z.zoneId} onMouseEnter={()=>setHover(z.zoneId)} onMouseLeave={()=>setHover('')} onClick={()=>{const app=useApp.getState();app.chooseZone(z.zoneId);app.setMode('select')}}>{z.name} ↗</button>
    </Html>)}
  </>;
}
