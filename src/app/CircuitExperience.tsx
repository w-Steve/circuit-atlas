import {t} from "../i18n";
import {useEffect,useLayoutEffect,useMemo,useState} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {Box3,Vector3} from 'three';
import {loadCircuit} from '../circuits/registry';
import type {CircuitPackage} from '../circuits/types';
import {createCircuitGeometry} from '../circuits/geometry';
import {createSpectators} from '../circuits/spectators';
import {terrainHeight} from '../circuits/elevation';
import {terrainSpectatorZones} from '../circuits/spectatorDatum';
import {circuitRuntime} from '../circuits/runtime';
import {mapRoad} from '../circuits/mapRoad';
import {Terrain} from '../components/Terrain';
import {CornerMarkers} from '../components/CornerMarkers';
import {ShanghaiLabelLayout} from '../components/ShanghaiLabelLayout';
import {TransientPanels,useDismissPanel} from '../components/TransientPanels';
import {SpectatorAreas} from '../systems/SpectatorAreas';
import {CircuitFacilities} from '../systems/CircuitFacilities';
import {ObserverCamera} from '../systems/ObserverCamera';
import {Vehicle} from '../systems/Vehicle';
import {CaptureBridge,PhoneControls} from '../systems/PhoneControls';
import {Telemetry} from '../systems/Telemetry';
import {ExposurePreview} from '../camera/ExposurePreview';
import {simulation} from '../systems/VehicleSimulation';
import {observer} from '../systems/GrandstandGeometry';
import {useApp} from '../store';
import type {ViewMode} from './navigation';
import {ExperienceBack,VenueInfoLink} from '../components/ExperienceNavigation';
import {saveSimulation,restoreSimulation} from './sceneState';
import {circuitName,circuitLocation,zoneName} from '../i18n/data';
import {MapOrientation} from '../components/MapOrientation';
import {SceneWarmup} from '../components/SceneWarmup';
import {TimingLayer,TimingLegend} from '../components/TimingLayer';

function CircuitScene({data,colored}:{data:CircuitPackage;colored:boolean}){
  const {geometry}=circuitRuntime.current!;
  const mode=useApp(s=>s.mode);
  const {road,verge,widths}=useMemo(()=>mapRoad(geometry,data.trackGeometry.widthMetres,.2),[geometry,data]);
  useEffect(()=>()=>{road.dispose();verge.dispose()},[road,verge]);
  const {gl}=useThree();
  useEffect(()=>{gl.domElement.dataset.mapReady=data.circuitId},[gl,data]);
  const bounds=new Box3().setFromPoints(geometry.geoPoints),center=bounds.getCenter(new Vector3());
  const ground=Math.min(...geometry.geoPoints.map(p=>p.y))-.5;
  return <>
    <color attach="background" args={[mode==='eye'||mode==='phone'?'#a7b2b0':'#161b20']}/>
    <ambientLight intensity={1.3}/><directionalLight position={[center.x+700,2000,center.z+600]} intensity={1.8}/>
    {(mode==='eye'||mode==='phone')&&<mesh rotation={[-Math.PI/2,0,0]} position={[center.x,data.elevation.grid?-300:ground,center.z]}><planeGeometry args={[20000,20000]}/><meshStandardMaterial color="#354c40"/></mesh>}
    <Terrain data={data} geometry={geometry} colored={mode==='overview'&&colored}/>
    <mesh geometry={verge}><meshStandardMaterial color="#c6cec4" side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/></mesh>
    <mesh geometry={road}><meshStandardMaterial color="#51585a" roughness={.95} side={2} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2}/></mesh>
    <SpectatorAreas/>
    <CircuitFacilities data={data} geometry={geometry}/>
    <TimingLayer data={data} geometry={geometry} widths={widths}/>
    <ShanghaiLabelLayout/>
    {mode==='overview'&&<CornerMarkers data={data} geometry={geometry}/>}
    <ObserverCamera/><Vehicle/><CaptureBridge/><ExposurePreview active/>
    <SceneWarmup/>
  </>;
}

function CircuitUI({data,colored,onColor}:{data:CircuitPackage;colored:boolean;onColor:()=>void}){
  const s=useApp(),[open,setOpen]=useState(false);
  useDismissPanel(open,()=>setOpen(false),'.zone-preview');
  useEffect(()=>{setOpen(false)},[s.mode]);
  const zone=data.spectatorZones.find(z=>z.zoneId===s.selection.zoneId)!;
  const p=observer(s.selection),g=circuitRuntime.current!.geometry;
  const groundAtEye=terrainHeight(data.elevation,g.origin[0]+p.x/(111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration),g.origin[1]-p.z/(111320*g.calibration));
  return <>
    <TransientPanels/>
    {(s.mode==='overview'||s.mode==='select')&&<MapOrientation/>}
    <header className="experience-header"><ExperienceBack/><div className="experience-title"><span>{circuitName(data.circuitId,data.name)}</span><small>{s.mode==='overview'?t("赛道鸟瞰"):zoneName(zone.name)}</small></div><div className="experience-brand"><VenueInfoLink/></div></header>
    {s.mode==='overview'&&<>
      <div className="map-heading"><h1>{circuitLocation(data.circuitId,data.location)}</h1><p>{t("选择观赛区域，走进现场。")}</p></div>
      <div className="map-tools"><button onClick={s.home} aria-label={t("恢复鸟瞰角度")}>⟳</button><span>{t("左键 / WASD 平移 · 右键旋转 · 滚轮缩放")}</span><TimingLegend/>{data.elevation.grid&&<button className="terrain-toggle" aria-pressed={colored} onClick={onColor}>{colored?t("高度配色 · 5m 等高线"):t("显示高度配色")}</button>}</div>
      <div className="zone-preview"><div><h2>{t("选择你的观赛区域")}</h2><p>{data.spectatorZones.filter(z=>z.availability==='available').length} {t("处观赛区域")}</p></div><button className="primary" aria-expanded={open} onClick={()=>setOpen(!open)}>{t("选择观察位置 ↗")}</button>{open&&<div className="zone-list">{data.spectatorZones.map(z=><button disabled={z.availability!=='available'} title={z.availability!=='available'?t("边界或朝向核验未通过，暂不开放"):undefined} key={z.zoneId} data-testid={`zone-option-${z.zoneId}`} onClick={()=>{s.chooseZone(z.zoneId);s.setMode('select');setOpen(false)}}>{zoneName(z.name)}<span>{z.availability==='available'?'↗':t("核验中")}</span></button>)}</div>}</div>
    </>}
    {s.mode==='select'&&<aside className="selection"><div className="selection-heading"><div><span className="overline">{t("选择观察位置")}</span><h2>{zoneName(zone.name)}</h2></div><button className="icon-button" aria-label={t("关闭选点")} onClick={()=>s.setMode('overview')}>×</button></div><div className="selection-stats"><span>{t(zone.kind==='grandstand'?"近似看台 · 眼高约":"地面观赛 · 眼高约")} {(p.y-groundAtEye).toFixed(1)} m</span></div><div className="selection-actions"><button className="primary" onClick={()=>s.setMode('eye')}>{t("进入此处视野 ↗")}</button><button className="secondary" onClick={()=>s.setMode('phone')}>{t("进入相机 ◎")}</button></div></aside>}
    {s.mode==='eye'&&<div className="view-tools"><button aria-label={t("赛道总览")} onClick={()=>s.setMode('overview')}>{t("返回地图")}</button><button onClick={()=>s.setMode('select')}>{t("重新选点")}</button><button onClick={s.home}>{t("看向赛道")}</button><button className="camera-entry" aria-label={t("打开手机相机")} onClick={()=>s.setMode('phone')}>◎ <span>{t("拿起相机")}</span></button></div>}
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
    const zones=terrainSpectatorZones(data);
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
  if(failed)return <div className="route-error" role="alert"><h1>{t("赛道数据未能载入")}</h1><button onClick={()=>location.reload()}>{t("重新载入")}</button><a href="#/circuits">{t("返回赛道集合")}</a></div>;
  if(!ready||!data)return <div className="loading">{t("正在载入赛道与看台…")}</div>;
  if(mode!=='overview'&&!data.spectatorZones.some(z=>z.zoneId===zoneId&&z.availability==='available'))return <div className="route-error"><h1>{data.spectatorZones.some(z=>z.zoneId===zoneId)?t("此观赛区域暂未开放"):t("找不到此观赛区域")}</h1><a href={`#/circuits/${circuitId}/map`}>{t("返回地图")}</a></div>;
  return <main className={`mode-${currentMode} ${currentMode==='phone'?'phone-mode':''}`}><div className="world"><Canvas gl={{preserveDrawingBuffer:true,antialias:true}} dpr={[1,1.5]} camera={{position:[0,4000,2000],near:1,far:20000,fov:50}} onCreated={({gl})=>{gl.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();simulation.pause();setLost(true)})}}><CircuitScene data={data} colored={colored}/></Canvas></div><div id="scene-labels"/><CircuitUI data={data} colored={colored} onColor={()=>setColored(!colored)}/>{lost&&<div className="map-message" role="alert"><h2>{t("地图画面已中断")}</h2><button onClick={()=>location.reload()}>{t("重新加载地图")}</button></div>}</main>;
}
