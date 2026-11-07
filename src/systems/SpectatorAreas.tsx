import {zoneName} from '../i18n/data';
import { useEffect, useMemo, useState } from "react";
import { Html } from "@react-three/drei";
import { BufferGeometry,Float32BufferAttribute,Vector3 } from "three";

import type { SpectatorSurface } from "../circuits/spectators";
import {useCircuit,useCircuitStore} from '../app/CircuitContext';
import { SelectionPoint } from "./SelectionPoint";
import {spectatorFence} from '../circuits/fenceGeometry';
import {deckRailing} from '../circuits/deckRailing';
import {spectatorCanopy} from '../circuits/spectatorCanopy';

function Fence({surface}:{surface:SpectatorSurface}){
  const runtime=useCircuit();
  const geometry=useMemo(()=>{
    const points:number[]=[];
    const segments=surface.definition.fenceMode==='authored'?[]:spectatorFence(surface,runtime.spectators,runtime.data,runtime.geometry,runtime.clearance());
    for(const [a,b] of segments){
      for(const h of [0,.55,1.1,1.65,2.2,2.75,3.3])points.push(a.x,a.y+h,a.z,b.x,b.y+h,b.z);
      points.push(a.x,a.y,a.z,a.x,a.y+3.5,a.z);
      // Diagonal wire geometry participates in the real camera depth test.
      const count=Math.max(1,Math.ceil(a.distanceTo(b)/.6));
      for(let cell=0;cell<count;cell++){
        const p=a.clone().lerp(b,cell/count),q=a.clone().lerp(b,(cell+1)/count);
        for(let h=0;h+.3<=3.3;h+=.3)points.push(p.x,p.y+h,p.z,q.x,q.y+h+.3,q.z,p.x,p.y+h+.3,p.z,q.x,q.y+h,q.z);
      }
    }
    const result=new BufferGeometry();result.setAttribute('position',new Float32BufferAttribute(points,3));return result;
  },[surface]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <lineSegments geometry={geometry}><lineBasicMaterial color="#263b32" transparent opacity={.92}/></lineSegments>;
}
function AreaSurface({surface,highlight,onHover}:{surface:SpectatorSurface;highlight:boolean;onHover:(zone:string)=>void}){
  const useApp=useCircuitStore();
  const runtime=useCircuit(),{surfaceGeometry}=runtime.spectators,selectionAt=runtime.selectAt;
  const rows=useMemo(()=>{
    if(!surface.definition.visualRows)return null;const vertices:number[]=[];
    for(let i=0;i<=surface.definition.visualRows;i++)for(const u of [0,1]){const p=runtime.spectators.surfacePoint(surface,u,i/surface.definition.visualRows);vertices.push(p.x,p.y+.05,p.z)}
    const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));return g;
  },[runtime,surface]);
  useEffect(()=>()=>rows?.dispose(),[rows]);
  const mode=useApp(s=>s.mode);
  const canopy=useMemo(()=>spectatorCanopy(surface,runtime.spectators),[surface,runtime]);
  useEffect(()=>()=>{canopy?.roof.dispose();canopy?.posts.dispose()},[canopy]);
  const railing=useMemo(()=>surface.definition.frontRailing?deckRailing(surface,runtime.spectators):null,[surface]);
  useEffect(()=>()=>railing?.dispose(),[railing]);
  const geometry=useMemo(()=>{
    if(surface.zone.kind!=='grandstand'||surface.zone.supportToTerrain===false)return surfaceGeometry(surface);
    const g=runtime.geometry;
    return surfaceGeometry(surface,p=>g.groundAt(p.x,p.y)-.15);
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
      <meshStandardMaterial color={highlight?'#d46750':surface.zone.kind!=='grandstand'?'#607854':'#8d9690'} roughness={.95} side={2}/>
    </mesh>
    {rows&&<lineSegments geometry={rows}><lineBasicMaterial color="#d4d7d0"/></lineSegments>}<Fence surface={surface}/>
    {railing&&<mesh geometry={railing} name={`deck-railing-${surface.definition.surfaceId}`}><meshStandardMaterial color="#426c60" roughness={.55} metalness={.35}/></mesh>}
    {canopy&&<group name={`spectator-canopy-${surface.definition.surfaceId}`}>
      {/* Open the roof only in the overhead picker; every physical view keeps it. */}
      <mesh geometry={canopy.roof} visible={mode!=='select'} name="spectator-canopy-roof" castShadow receiveShadow><meshStandardMaterial color="#d9d6c8" roughness={.9} side={2}/></mesh>
      <mesh geometry={canopy.posts} name="spectator-canopy-posts" castShadow receiveShadow><meshStandardMaterial color="#59615c" roughness={.65} metalness={.35}/></mesh>
    </group>}
  </>;
}
export function SpectatorAreas({active=true}:{active?:boolean}){
  const useApp=useCircuitStore();
  const runtime=useCircuit();
  const {zoneSurfaces,spectatorZones,zonePoint}=runtime.spectators;
  const mode=useApp(s=>s.mode),zone=useApp(s=>s.selection.zoneId??'a');

  const [hover,setHover]=useState('');
  return <>
    {active&&mode==='select'&&<SelectionPoint/>}
    {[...zoneSurfaces].flatMap(([id,surfaces])=>surfaces.map(s=><AreaSurface key={s.definition.surfaceId} surface={s} highlight={hover===id||(mode==='select'&&zone===id)} onHover={setHover}/>))}
    {active&&mode==='overview'&&spectatorZones.map(z=><Html key={z.zoneId} portal={{current:document.getElementById('scene-labels')!}} position={z.mapLabelPosition?new Vector3(...z.mapLabelPosition):zonePoint(z.zoneId,.5,.5).add(new Vector3(0,25,0))} center>
      <button className="marker zone-marker" data-zone={z.zoneId} onMouseEnter={()=>setHover(z.zoneId)} onMouseLeave={()=>setHover('')} onClick={()=>{const app=useApp.getState();app.chooseZone(z.zoneId);app.setMode('select')}}>{zoneName(z.name)} ↗</button>
    </Html>)}
  </>;
}
