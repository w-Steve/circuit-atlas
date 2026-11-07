import {CircuitContext,createCircuitContext,useCircuit} from '../app/CircuitContext';
import {circuitName,circuitLocation,circuitCountry,sourceSummary} from '../i18n/data';
import {t,tr} from "../i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Box3, Vector3, MOUSE } from "three";
import type { OrbitControls as Controls } from "three-stdlib";
import { loadCircuit, circuitRegistry } from "../circuits/registry";
import type { CircuitPackage } from "../circuits/types";
import { CornerMarkers } from "../components/CornerMarkers";
import { ErrorBoundary } from "../systems/ErrorBoundary";
import { Terrain } from "../components/Terrain";
import {mapRoad} from "../circuits/mapRoad";
import {MapKeyboard} from "../components/MapKeyboard";
import {circuitVisit} from '../app/circuitVisit';
import {TimingLayer,TimingLegend} from '../components/TimingLayer';


function MapScene({data, reset, enhanced, onLost}: {data: CircuitPackage; reset: number;enhanced:boolean;onLost:()=>void}) {
  const runtime=useCircuit(),{geometry,views:savedViews}=runtime;
  const {road,verge}=useMemo(()=>mapRoad(geometry,data.trackGeometry.widthMetres),[geometry,data]);
  useEffect(()=>()=>{road.dispose();verge.dispose()},[road,verge]);
  const controls = useRef<Controls>(null);
  useEffect(()=>{runtime.controls.current=controls.current;return()=>{runtime.controls.current=null}},[runtime]);
  const {camera,size,gl,invalidate} = useThree();
  const initialized=useRef(false);
  const visit=circuitVisit(data.circuitId);
  const remember=()=>{
    if(!initialized.current||!controls.current)return;
    const view={position:camera.position.toArray(),target:controls.current.target.toArray()};
    savedViews.set(data.circuitId,{...view,visit});
    gl.domElement.dataset.mapView=JSON.stringify(view);
  };
  useEffect(()=>{
    const lost=(e:Event)=>{e.preventDefault();onLost()};
    gl.domElement.addEventListener('webglcontextlost',lost);
    return ()=>gl.domElement.removeEventListener('webglcontextlost',lost);
  },[gl,onLost]);
  const bounds = useMemo(()=>new Box3().setFromPoints(geometry.geoPoints),[geometry]);
  const center = useMemo(()=>bounds.getCenter(new Vector3()),[bounds]);
  const span = bounds.getSize(new Vector3());
  useEffect(()=>{
    const distance = Math.max(span.z,span.x/(size.width/size.height))*1.3;
    const remembered=savedViews.get(data.circuitId);
    const saved = !initialized.current && reset===0 && remembered?.visit===visit ? remembered : undefined;
    const target=saved?new Vector3().fromArray(saved.target):center;
    if(saved)camera.position.fromArray(saved.position);
    else camera.position.set(center.x, distance, center.z+distance*.58);
    camera.lookAt(target);
    camera.near=5; camera.far=20000; camera.updateProjectionMatrix();
    controls.current?.target.copy(target); controls.current?.update();
    gl.domElement.dataset.mapReady=data.circuitId;
    initialized.current=true;remember();
    invalidate();
  },[data,reset,visit,size.width,size.height,camera,gl,center,span.x,span.z,invalidate]);
  return <>
    <color attach="background" args={["#161b20"]}/>
    <ambientLight intensity={1.1}/>
    <directionalLight position={[1000,2500,600]} intensity={1.4}/>
    <group>
      <Terrain data={data} geometry={geometry} colored={enhanced}/>
      <mesh geometry={verge}><meshStandardMaterial color="#c6cec4" side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/></mesh>
      <mesh geometry={road}><meshStandardMaterial color="#3d4845" roughness={1} side={2} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2}/></mesh>
    </group>
    <CornerMarkers data={data} geometry={geometry} />
    <TimingLayer data={data} geometry={geometry} roadSurfaceOffset={.4}/>
    <MapKeyboard controls={controls}/><OrbitControls mouseButtons={{LEFT:MOUSE.PAN,MIDDLE:MOUSE.DOLLY,RIGHT:MOUSE.ROTATE}} ref={controls} makeDefault onChange={remember} enableDamping dampingFactor={.15} screenSpacePanning={false} minDistance={80} maxDistance={10000} maxPolarAngle={Math.PI*.47}/>
  </>;
}

export default function CircuitMapPage({circuitId}: {circuitId:string}) {
  const [data,setData] = useState<CircuitPackage>();
  const [failed,setFailed] = useState(false), [reset,setReset]=useState(0), [info,setInfo]=useState(false);
  const [enhanced,setEnhanced]=useState(true);
  const [lost,setLost]=useState(false);
  const summary = circuitRegistry.find(c=>c.circuitId===circuitId);
  useEffect(()=>{
    let cancelled=false;
    setData(undefined);setFailed(false);setInfo(false);setEnhanced(true);setLost(false);setReset(0);
    loadCircuit(circuitId).then(d=>{if(!cancelled)setData(d)}).catch(()=>{if(!cancelled)setFailed(true)});
    return ()=>{cancelled=true};
  },[circuitId]);
  const runtime=useMemo(()=>data?createCircuitContext(data):null,[data]);
  return <CircuitContext.Provider value={runtime}><main className="explorer-page">
    <header className="explorer-nav"><a href="#/circuits">{t("← 赛道集合")}</a><b>{t("赛道图鉴")}</b><span>2026</span></header>
    <div className="explorer-title"><span className="overline">{summary&&circuitCountry(summary.circuitId,summary.country)} / {summary&&circuitLocation(summary.circuitId,summary.location)}</span><h1>{summary?circuitName(summary.circuitId,summary.name):t('未知赛道')}</h1><p>{summary ? tr`${(summary.lengthMetres/1000).toFixed(3)} km · ${summary.cornerCount} 个弯道` : ""}</p></div>
    {failed ? <div className="map-message" role="alert"><h2>{t("赛道数据未能载入")}</h2><button onClick={()=>location.reload()}>{t("重新载入")}</button><a href="#/circuits">{t("返回赛道集合")}</a></div>
    : !data ? <div className="map-message">{t("正在载入赛道…")}</div>
    : data.mapAvailability==='preparing' ? <div className="map-message"><h2>{t("地图数据核对中")}</h2><p>{circuitId==='madrid' ? t("正在核对 2026 正式线路与旧版地理资料的差异。") : t("中心线已取得，正式弯道编号位置仍在核对。")}</p><p>{t("核实后开放地图浏览。")}</p><a href="#/circuits">{t("返回赛道集合")}</a></div>
    : <ErrorBoundary key={circuitId}><Canvas className="explorer-canvas" frameloop="demand" dpr={[1,1.5]} camera={{position:[0,4000,2000],near:1,far:30000,fov:50}}><MapScene data={data} reset={reset} enhanced={enhanced} onLost={()=>setLost(true)}/></Canvas></ErrorBoundary>}
    {lost&&<div className="map-message map-interrupted" role="alert"><h2>{t("地图画面已中断")}</h2><button onClick={()=>location.reload()}>{t("重新加载地图")}</button><a href="#/circuits">{t("返回赛道集合")}</a></div>}
    {data?.mapAvailability==='available' && <>
      <div className="explorer-tools">{data.timing&&<TimingLegend/>}{data.elevation.grid&&<button aria-pressed={enhanced} onClick={()=>setEnhanced(!enhanced)}>{enhanced?t("高度配色 · 5m 等高线"):t("显示高度配色")}</button>}<button onClick={()=>setReset(n=>n+1)} aria-label={t("恢复鸟瞰角度")}>{t("↺ 复位")}</button><button aria-expanded={info} onClick={()=>setInfo(!info)}>{t("ⓘ 地图说明")}</button></div>
      <div className="explorer-hint">{enhanced&&data.elevation.grid&&<span className="terrain-legend"><i aria-hidden="true"/><span>{Math.round(Math.min(...data.elevation.grid.heights)-data.elevation.grid.referenceAltitude)}–{Math.round(Math.max(...data.elevation.grid.heights)-data.elevation.grid.referenceAltitude)} {t("m · 相对高程")}</span></span>}{t("左键 / WASD 平移 · 右键旋转 · 滚轮缩放")}<span>{t("观赛模拟尚未开放")}</span></div>
      {info && <aside className="map-info"><h2>{t("地图与数据")}</h2><p>{sourceSummary(data.elevation.notes,'elevation')}</p>{data.elevation.overpasses&&<p>{t("铃鹿西直道为上层，Degner 出口为下层。桥面间距约 7m 为示意估计，非实测净空。")}</p>}<p>{t("中心线按公布圈长校准；路宽为示意值。弯道位置经过地理配准，存在数米偏差。")}</p><p>{t("当前仅提供地图浏览，没有可用的观赛区域。")}</p>{data.dataSources.map((s,i)=><a key={i} href={s.url} target="_blank" rel="noreferrer">{i===0?t("赛事资料"):t("中心线来源")} ↗</a>)}<small>{t("核查日期 2026.10.22")}</small></aside>}
    </>}
  </main></CircuitContext.Provider>;
}
