import {useEffect,useLayoutEffect,useMemo,useState} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {Box3,Vector3} from 'three';
import {loadCircuit} from '../circuits/registry';
import type {CircuitPackage} from '../circuits/types';
import {createCircuitGeometry} from '../circuits/geometry';
import {createSpectators} from '../circuits/spectators';
import {terrainHeight} from '../circuits/elevation';
import {circuitRuntime} from '../circuits/runtime';
import {mapRoad} from '../circuits/mapRoad';
import {Terrain} from '../components/Terrain';
import {CornerMarkers} from '../components/CornerMarkers';
import {ShanghaiLabelLayout} from '../components/ShanghaiLabelLayout';
import {TransientPanels,useDismissPanel} from '../components/TransientPanels';
import {SpectatorAreas} from '../systems/SpectatorAreas';
import {ObserverCamera} from '../systems/ObserverCamera';
import {Vehicle} from '../systems/Vehicle';
import {CaptureBridge,PhoneControls} from '../systems/PhoneControls';
import {Telemetry} from '../systems/Telemetry';
import {ExposurePreview} from '../camera/ExposurePreview';
import {simulation} from '../systems/VehicleSimulation';
import {observer} from '../systems/GrandstandGeometry';
import {useApp} from '../store';
import type {ViewMode} from './navigation';
import {navigate} from './navigation';
import {saveSimulation,restoreSimulation} from './sceneState';

function CircuitScene({data,colored}:{data:CircuitPackage;colored:boolean}){
  const {geometry}=circuitRuntime.current!;
  const mode=useApp(s=>s.mode);
  const {road,verge}=useMemo(()=>mapRoad(geometry,data.trackGeometry.widthMetres,.2),[geometry,data]);
  useEffect(()=>()=>{road.dispose();verge.dispose()},[road,verge]);
  const {gl}=useThree();
  useEffect(()=>{gl.domElement.dataset.mapReady=data.circuitId},[gl,data]);
  const bounds=new Box3().setFromPoints(geometry.geoPoints),center=bounds.getCenter(new Vector3());
  const ground=Math.min(...geometry.geoPoints.map(p=>p.y))-.5;
  return <>
    <color attach="background" args={[mode==='eye'||mode==='phone'?'#a7b2b0':'#202a28']}/>
    <ambientLight intensity={1.3}/><directionalLight position={[center.x+700,2000,center.z+600]} intensity={1.8}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[center.x,data.elevation.grid?-300:ground,center.z]}><planeGeometry args={[20000,20000]}/><meshStandardMaterial color="#354c40"/></mesh>
    <Terrain data={data} geometry={geometry} colored={mode==='overview'&&colored}/>
    <mesh geometry={verge}><meshStandardMaterial color="#c6cec4" side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/></mesh>
    <mesh geometry={road}><meshStandardMaterial color="#3d4845" side={2} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2}/></mesh>
    <SpectatorAreas/>
    <ShanghaiLabelLayout/>
    {mode==='overview'&&<CornerMarkers data={data} geometry={geometry}/>}
    <ObserverCamera/><Vehicle/><CaptureBridge/><ExposurePreview active/>
  </>;
}

function CircuitUI({data,colored,onColor}:{data:CircuitPackage;colored:boolean;onColor:()=>void}){
  const s=useApp(),[open,setOpen]=useState(false),[info,setInfo]=useState(false);
  useDismissPanel(open,()=>setOpen(false),'.zone-preview');
  useDismissPanel(info,()=>setInfo(false),'.circuit-source-panel,.circuit-info-toggle');
  useEffect(()=>{setOpen(false);setInfo(false)},[s.mode]);
  const zone=data.spectatorZones.find(z=>z.zoneId===s.selection.zoneId)!;
  const p=observer(s.selection);
  return <>
    <TransientPanels/>
    <header className="experience-header"><button className="back-link" aria-label="← 选择赛道" onClick={()=>navigate('#/circuits')}>← <span>赛道集合</span></button><div className="experience-title"><span>{data.name}</span><small>{s.mode==='overview'?'赛道鸟瞰':zone.name}</small></div><div className="experience-brand">赛道图鉴 <button className="circuit-info-toggle" aria-label="ⓘ 地图说明" aria-expanded={info} onClick={()=>setInfo(!info)}>ⓘ</button></div></header>
    {s.mode==='overview'&&<>
      <div className="map-heading"><h1>{data.location}</h1><p>选择观赛区域，走进现场。</p></div>
      <div className="map-tools"><button onClick={s.home} aria-label="恢复鸟瞰角度">⟳</button><span>左键 / WASD 平移 · 右键旋转 · 滚轮缩放</span>{data.elevation.grid&&<button className="terrain-toggle" aria-pressed={colored} onClick={onColor}>{colored?'高度配色 · 5m 等高线':'显示高度配色'}</button>}</div>
      <div className="zone-preview"><div><h2>选择你的观赛区域</h2><p>{data.spectatorZones.filter(z=>z.availability==='available').length} 处看台 · 近似建模</p></div><button className="primary" aria-expanded={open} onClick={()=>setOpen(!open)}>选择观察位置 ↗</button>{open&&<div className="zone-list">{data.spectatorZones.map(z=><button disabled={z.availability!=='available'} title={z.availability!=='available'?'边界或朝向核验未通过，暂不开放':undefined} key={z.zoneId} data-testid={`zone-option-${z.zoneId}`} onClick={()=>{s.chooseZone(z.zoneId);s.setMode('select');setOpen(false)}}>{z.name}<span>{z.availability==='available'?'↗':'核验中'}</span></button>)}</div>}</div>
    </>}
    {s.mode==='select'&&<aside className="selection"><div className="selection-heading"><div><span className="overline">选择观察位置</span><h2>{zone.name}</h2></div><button className="icon-button" aria-label="关闭选点" onClick={()=>s.setMode('overview')}>×</button></div><div className="selection-stats"><span>近似看台 · 眼高约 {(p.y-circuitRuntime.current!.spectators.zonePoint(zone.zoneId,s.selection.u,0,false).y+zone.surface.baseHeight).toFixed(1)} m</span></div><div className="selection-actions"><button className="primary" onClick={()=>s.setMode('eye')}>进入此处视野 ↗</button><button className="secondary" onClick={()=>s.setMode('phone')}>进入相机 ◎</button></div></aside>}
    {s.mode==='eye'&&<div className="view-tools"><button aria-label="赛道总览" onClick={()=>s.setMode('overview')}>返回地图</button><button onClick={()=>s.setMode('select')}>重新选点</button><button onClick={s.home}>看向赛道</button><button className="camera-entry" aria-label="打开手机相机" onClick={()=>s.setMode('phone')}>◎ <span>拿起相机</span></button></div>}
    {info&&<aside className="circuit-source-panel"><h2>地图与精度</h2><p>连续选点、真实比例。看台边界来自公开地图配准或OSM；高度、坡度与围网为估计，不提供具体座位视野保证。</p><p>{zone.source.notes}</p><p>{data.elevation.notes}</p><a href={zone.source.url} target="_blank" rel="noreferrer">看台位置来源 ↗</a>{zone.openingSource&&<a href={zone.openingSource.url} target="_blank" rel="noreferrer">场馆看台资料 ↗</a>}</aside>}
    <div className="experience-footnote"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></div>
    <Telemetry/><PhoneControls/>
  </>;
}

export default function CircuitExperience({circuitId,mode,zoneId}:{circuitId:string;mode:ViewMode;zoneId:string}){
  const [data,setData]=useState<CircuitPackage>(),[failed,setFailed]=useState(false),[ready,setReady]=useState(false),[lost,setLost]=useState(false);
  const currentMode=useApp(s=>s.mode),[colored,setColored]=useState(true);
  useEffect(()=>{let alive=true;loadCircuit(circuitId).then(value=>{if(alive)setData(value)}).catch(()=>{if(alive)setFailed(true)});return()=>{alive=false}},[circuitId]);
  useLayoutEffect(()=>{
    if(!data)return;
    const geometry=createCircuitGeometry(data.trackGeometry.coordinates,data.lengthMetres,data.elevation);
    // Add the source terrain altitude once. Eye heights and stand rises remain metres.
    const zones=data.spectatorZones.filter(z=>z.availability==='available').map(z=>({...z,surfaces:z.surfaces?.map(surface=>{
      const center=surface.boundary.reduce((p,q)=>[p[0]+q[0],p[1]+q[1]],[0,0]).map(v=>v/surface.boundary.length);
      return {...surface,baseHeight:surface.baseHeight+terrainHeight(data.elevation,center[0],center[1])};
    })}));
    const spectators=createSpectators(zones,geometry);
    circuitRuntime.current={data,geometry,spectators};
    const app=useApp.getState();app.activateCircuit(data.circuitId,zones[0].zoneId);
    if(!zones.some(z=>z.zoneId===useApp.getState().selection.zoneId))app.chooseZone(zones[0].zoneId);
    const selected=useApp.getState().selection.zoneId??zones[0].zoneId;
    const center=spectators.zonePassCenter(selected);
    restoreSimulation(data.circuitId,center-350,center+450);
    setReady(true);
    return()=>{saveSimulation(data.circuitId);circuitRuntime.current=null};
  },[data]);
  useLayoutEffect(()=>{
    if(!ready||!data)return;
    if(mode!=='overview'&&!data.spectatorZones.some(z=>z.zoneId===zoneId&&z.availability==='available'))return;
    const app=useApp.getState();
    if(mode!=='overview'&&data.spectatorZones.some(z=>z.zoneId===zoneId&&z.availability==='available'))app.chooseZone(zoneId);
    app.setMode(mode);
  },[ready,data,mode,zoneId]);
  if(failed)return <div className="route-error" role="alert"><h1>赛道数据未能载入</h1><button onClick={()=>location.reload()}>重新载入</button><a href="#/circuits">返回赛道集合</a></div>;
  if(!ready||!data)return <div className="loading">正在载入赛道与看台…</div>;
  if(mode!=='overview'&&!data.spectatorZones.some(z=>z.zoneId===zoneId&&z.availability==='available'))return <div className="route-error"><h1>{data.spectatorZones.some(z=>z.zoneId===zoneId)?'此观赛区域暂未开放':'找不到此观赛区域'}</h1><a href={`#/circuits/${circuitId}/map`}>返回地图</a></div>;
  return <main className={`mode-${currentMode} ${currentMode==='phone'?'phone-mode':''}`}><div className="world"><Canvas gl={{preserveDrawingBuffer:true,antialias:true}} dpr={[1,1.5]} camera={{position:[0,4000,2000],near:1,far:20000,fov:50}} onCreated={({gl})=>{gl.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();simulation.pause();setLost(true)})}}><CircuitScene data={data} colored={colored}/></Canvas></div><div id="scene-labels"/><CircuitUI data={data} colored={colored} onColor={()=>setColored(!colored)}/>{lost&&<div className="map-message" role="alert"><h2>地图画面已中断</h2><button onClick={()=>location.reload()}>重新加载地图</button></div>}</main>;
}
