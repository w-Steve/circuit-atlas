import {ErrorScreen} from '../systems/ErrorBoundary';
import {SceneSun} from '../components/SceneSun';
import {ScenePerformance} from '../components/ScenePerformance';
import {SceneContextLoss} from '../components/SceneContextLoss';
import {useShallow} from 'zustand/react/shallow';
import {CircuitContext,createCircuitContext,useCircuit,useCircuitStore,type CircuitContextValue} from './CircuitContext';
import {AuthoredScene} from '../components/AuthoredScene';
import {SourcedBarriers} from '../components/SourcedBarriers';
import {t} from "../i18n";
import {useEffect,useLayoutEffect,useMemo,useState} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {loadCircuit} from '../circuits/registry';
import {resolveSpectatorZoneId} from '../circuits/zoneAliases';
import type {CircuitPackage} from '../circuits/types';

import {terrainHeight} from '../circuits/elevation';

import {mapRoad} from '../circuits/mapRoad';
import {Terrain} from '../components/Terrain';
import {CornerMarkers} from '../components/CornerMarkers';
import {SceneLabelLayout} from '../components/SceneLabelLayout';
import {TransientPanels,useDismissPanel} from '../components/TransientPanels';
import {SpectatorAreas} from '../systems/SpectatorAreas';
import {CircuitFacilities} from '../systems/CircuitFacilities';
import {ObserverCamera} from '../systems/ObserverCamera';
import {Vehicle} from '../systems/Vehicle';
import {CaptureBridge,PhoneControls} from '../systems/PhoneControls';
import {Telemetry} from '../systems/Telemetry';
import {ExposurePreview} from '../camera/ExposurePreview';

import type {ViewMode} from './navigation';
import {ExperienceBack,VenueInfoLink} from '../components/ExperienceNavigation';

import {circuitName,circuitLocation,zoneName} from '../i18n/data';
import {MapOrientation} from '../components/MapOrientation';
import {SceneWarmup} from '../components/SceneWarmup';
import {TimingLayer,TimingLegend} from '../components/TimingLayer';

function CircuitScene({data,colored}:{data:CircuitPackage;colored:boolean}){
  const runtime=useCircuit(),useApp=useCircuitStore(),{geometry}=runtime;
  const mode=useApp(s=>s.mode);
  const {road,verge,widths}=useMemo(()=>mapRoad(geometry,data.trackGeometry.widthMetres,.2),[geometry,data]);
  useEffect(()=>()=>{road.dispose();verge.dispose()},[road,verge]);
  const {gl}=useThree();
  useEffect(()=>{gl.domElement.dataset.mapReady=data.circuitId;gl.domElement.dataset.sceneEngine='shared'},[gl,data]);
  const center=runtime.mapCenter;
  const ground=Math.min(...geometry.geoPoints.map(p=>p.y))-.5;
  return <>
    <color attach="background" args={[mode==='eye'||mode==='phone'?'#a7b2b0':'#161b20']}/>
    <ambientLight intensity={1.6}/><SceneSun/>
    {(mode==='eye'||mode==='phone')&&<mesh rotation={[-Math.PI/2,0,0]} position={[center.x,data.elevation.grid?-300:ground,center.z]}><planeGeometry args={[20000,20000]}/><meshStandardMaterial color="#354c40"/></mesh>}
    <Terrain data={data} geometry={geometry} foundations={data.scene?.foundations} colored={mode==='overview'&&colored}/>
    <mesh receiveShadow geometry={verge}><meshStandardMaterial color="#c6cec4" side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/></mesh>
    <mesh receiveShadow geometry={road}><meshStandardMaterial color="#51585a" roughness={.95} side={2} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2}/></mesh>
    <SpectatorAreas/><AuthoredScene/><SourcedBarriers/>
    <CircuitFacilities data={data} geometry={geometry} road={road} verge={verge}/>
    <TimingLayer data={data} geometry={geometry} widths={widths}/>
    <SceneLabelLayout/>
    {mode==='overview'&&<CornerMarkers data={data} geometry={geometry}/>}
    <ObserverCamera/><Vehicle/><CaptureBridge/><ExposurePreview active/>
    <SceneWarmup/><ScenePerformance/>
  </>;
}

function CircuitUI({data,colored,onColor}:{data:CircuitPackage;colored:boolean;onColor:()=>void}){
  const runtime=useCircuit(),useApp=useCircuitStore(),{observer}=runtime;
  const s=useApp(useShallow(s=>({mode:s.mode,selection:s.selection,home:s.home,chooseZone:s.chooseZone,setMode:s.setMode,select:s.select}))),[open,setOpen]=useState(false);
  useDismissPanel(open,()=>setOpen(false),'.zone-preview');
  useEffect(()=>{setOpen(false)},[s.mode]);
  const zone=data.spectatorZones.find(z=>z.zoneId===s.selection.zoneId)!;
  const p=observer(s.selection),g=runtime.geometry;
  const groundAtEye=terrainHeight(data.elevation,g.origin[0]+p.x/(111320*Math.cos(g.origin[1]*Math.PI/180)*g.calibration),g.origin[1]-p.z/(111320*g.calibration));
  return <>
    <TransientPanels/>
    {(s.mode==='overview'||s.mode==='select')&&<MapOrientation/>}
    <header className="experience-header"><ExperienceBack/><div className="experience-title"><span>{circuitName(data.circuitId,data.name)}</span><small>{s.mode==='overview'?t("赛道鸟瞰"):zoneName(zone.name)+(data.scene?.regions?.find(r=>r.zoneId===zone.zoneId&&r.tier===s.selection.tier)?' / '+t(data.scene.regions.find(r=>r.zoneId===zone.zoneId&&r.tier===s.selection.tier)!.label):'')}</small></div><div className="experience-brand"><VenueInfoLink/></div></header>
    {s.mode==='overview'&&<>
      <div className="map-heading"><h1>{circuitLocation(data.circuitId,data.location)}</h1><p>{t("选择观赛区域，走进现场。")}</p></div>
      <div className="map-tools"><button onClick={s.home} aria-label={t("恢复鸟瞰角度")}>⟳</button><span>{t("左键 / WASD 平移 · 右键旋转 · 滚轮缩放")}</span><TimingLegend/>{data.elevation.grid&&<button className="terrain-toggle" aria-pressed={colored} onClick={onColor}>{colored?t("高度配色 · 5m 等高线"):t("显示高度配色")}</button>}</div>
      <div className="zone-preview"><div><h2>{t("选择你的观赛区域")}</h2><p>{data.spectatorZones.filter(z=>z.availability==='available').length} {t("处观赛区域")}</p></div><button className="primary" aria-expanded={open} onClick={()=>setOpen(!open)}>{t("选择观察位置 ↗")}</button>{open&&<div className="zone-list">{data.spectatorZones.map(z=><button disabled={z.availability!=='available'} title={z.availability!=='available'?t("边界或朝向核验未通过，暂不开放"):undefined} key={z.zoneId} data-testid={`zone-option-${z.zoneId}`} onClick={()=>{s.chooseZone(z.zoneId);s.setMode('select');setOpen(false)}}>{zoneName(z.name)}<span>{z.availability==='available'?'↗':t("核验中")}</span></button>)}</div>}</div>
    </>}
    {s.mode==='select'&&<aside className="selection"><div className="selection-heading"><div><span className="overline">{t("选择观察位置")}</span><h2>{zoneName(zone.name)}</h2></div><button className="icon-button" aria-label={t("关闭选点")} onClick={()=>s.setMode('overview')}>×</button></div>{data.scene?.regions?.some(r=>r.zoneId===zone.zoneId)&&<div className="tier-buttons" role="group" aria-label={t("A 看台分层")}>{data.scene.regions.filter(r=>r.zoneId===zone.zoneId).map(r=><button key={r.tier} aria-pressed={s.selection.tier===r.tier} onClick={()=>s.select({...s.selection,tier:r.tier})}>{t(r.label)}</button>)}</div>}<div className="selection-stats"><span>{t(zone.kind==='grandstand'?"近似看台 · 眼高约":"地面观赛 · 眼高约")} {(p.y-groundAtEye).toFixed(1)} m</span></div>{zone.admissionNote&&<p className="selection-admission" role="note">{t(zone.admissionNote)}</p>}<div className="selection-actions"><button className="primary" onClick={()=>s.setMode('eye')}>{t("进入此处视野 ↗")}</button><button className="secondary" onClick={()=>s.setMode('phone')}>{t("进入相机 ◎")}</button></div></aside>}
    {s.mode==='eye'&&<div className="view-tools"><button aria-label={t("赛道总览")} onClick={()=>s.setMode('overview')}>{t("返回地图")}</button><button onClick={()=>s.setMode('select')}>{t("重新选点")}</button><button onClick={s.home}>{t("看向赛道")}</button><button className="camera-entry" aria-label={t("打开手机相机")} onClick={()=>s.setMode('phone')}>◎ <span>{t("拿起相机")}</span></button></div>}
    <div className="experience-footnote"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>{data.elevation.attribution&&<a href={data.elevation.attribution.url} target="_blank" rel="noreferrer">{t(data.elevation.attribution.label)}</a>}</div>
    <Telemetry/><PhoneControls/>
  </>;
}

export default function CircuitExperience({circuitId,mode,zoneId,contexts}:{circuitId:string;mode:ViewMode;zoneId:string;contexts:Map<string,CircuitContextValue>}){
 const [runtime,setRuntime]=useState<CircuitContextValue>(),[failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true;const existing=contexts.get(circuitId);if(existing){setRuntime(existing);return}
  loadCircuit(circuitId).then(data=>{if(!alive)return;const value=createCircuitContext(data);contexts.set(circuitId,value);setRuntime(value)}).catch(()=>{if(alive)setFailed(true)});
  return()=>{alive=false};
 },[circuitId,contexts]);
 if(failed)return <div className="route-error" role="alert"><h1>{t("赛道数据未能载入")}</h1><button onClick={()=>location.reload()}>{t("重新载入")}</button><a href="#/circuits">{t("返回赛道集合")}</a></div>;
 return runtime?<CircuitContext.Provider value={runtime}><CircuitHost mode={mode} zoneId={zoneId}/></CircuitContext.Provider>:<div className="loading">{t("正在载入赛道与看台…")}</div>;
}
function CircuitHost({mode,zoneId}:{mode:ViewMode;zoneId:string}){
 const runtime=useCircuit(),useApp=useCircuitStore(),{data,simulation}=runtime;
 const requestedZoneId=zoneId;
 zoneId=resolveSpectatorZoneId(data,zoneId);
 const currentMode=useApp(s=>s.mode),colored=useApp(s=>s.terrainColored),[lost,setLost]=useState(false);
 useLayoutEffect(()=>{if(mode!=='overview'&&!data.spectatorZones.some(z=>z.zoneId===zoneId&&z.availability==='available'))return;const app=useApp.getState();if(mode!=='overview')app.chooseZone(zoneId);app.setMode(mode)},[runtime,mode,zoneId,requestedZoneId]);
 useEffect(()=>()=>simulation.pause(),[simulation]);
 if(mode!=='overview'&&!data.spectatorZones.some(z=>z.zoneId===zoneId&&z.availability==='available'))return <div className="route-error"><h1>{data.spectatorZones.some(z=>z.zoneId===zoneId)?t("此观赛区域暂未开放"):t("找不到此观赛区域")}</h1><a href={`#/circuits/${data.circuitId}/map`}>{t("返回地图")}</a></div>;
 return <main className={`mode-${currentMode} ${currentMode==='phone'?'phone-mode':''}`}><div className="world"><Canvas shadows gl={{preserveDrawingBuffer:true,antialias:true}} dpr={[1,1.5]} camera={{position:[0,4000,2000],near:1,far:20000,fov:50}}><SceneContextLoss onLost={setLost}/><CircuitScene data={data} colored={colored}/></Canvas></div><div id="scene-labels"/><CircuitUI data={data} colored={colored} onColor={()=>useApp.getState().setTerrainColored(!colored)}/>{lost&&<ErrorScreen title={t("WebGL 画面已中断")} message={t("赛车已暂停，可以重新加载场景恢复。")}/>}</main>;
}
