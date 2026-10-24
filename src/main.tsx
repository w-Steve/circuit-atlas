import {t} from "./i18n";
import { lazy, Suspense, useEffect, useLayoutEffect, useState, useRef, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
const ShanghaiExperience = lazy(() =>
  import("./app/ShanghaiExperience").then((m) => ({
    default: m.ShanghaiExperience,
  })),
);
const CircuitExperience=lazy(()=>import("./app/CircuitExperience"));

import {saveSimulation,restoreSimulation} from "./app/sceneState";
import {passStart,passEnd} from "./systems/VehicleSimulation";
const CircuitMapPage = lazy(() => import("./pages/CircuitMapPage"));
import { parseRoute, circuitPath, navigate } from "./app/navigation";
import { CatalogPage } from "./pages/CatalogPage";
const AtlasVenuePage=lazy(()=>import('./pages/AtlasVenuePage'));
import { circuitRegistry } from "./circuits/registry";
import { ErrorBoundary } from "./systems/ErrorBoundary";
import { useApp } from "./store";
import "./style.css";
import "./design-system/tokens.css";
import {useLanguage} from './i18n';
import {WorldFlight} from './components/WorldFlight';
import {noteCircuitEntry} from './app/circuitVisit';
function subscribe(fn: () => void) {
  let previous=parseRoute(location.hash);
  const changed=()=>{const next=parseRoute(location.hash);noteCircuitEntry(previous,next);previous=next;fn()};
  window.addEventListener("hashchange", changed);
  return () => window.removeEventListener("hashchange", changed);
}
function ShanghaiHost({mode,zoneId,active}:{active:boolean;mode:import('./app/navigation').ViewMode;zoneId:string}){
  const [ready,setReady]=useState(false);
  useLayoutEffect(()=>{useApp.getState().activateCircuit('shanghai');restoreSimulation('shanghai',passStart,passEnd);setReady(true);return()=>saveSimulation('shanghai')},[]);
  useLayoutEffect(()=>{if(ready&&active){const app=useApp.getState();if(mode!=='overview')app.chooseZone(zoneId);app.setMode(mode)}},[ready,active,mode,zoneId]);
  return ready?<ShanghaiExperience active={active}/>:<div className="loading">{t("正在载入上海…")}</div>;
}
function App() {
  const language=useLanguage(s=>s.language);
  useEffect(()=>{document.documentElement.lang=language==='en'?'en':'zh-CN';document.title=language==='en'?'Circuit Atlas · Race views and photography':'赛道图鉴 · 世界赛道与观赛视野'},[language]);
  const hash=useSyncExternalStore(subscribe,()=>location.hash,()=>''),route=parseRoute(hash);
  const isShanghai=route.level==='circuit'&&route.circuitId==='shanghai'&&(route.mode==='overview'||circuitRegistry.find(c=>c.circuitId==='shanghai')?.spectatorZoneIds?.includes(route.zoneId));
  const isSharedExperience=route.level==='circuit'&&route.circuitId!=='shanghai'&&circuitRegistry.some(c=>c.circuitId===route.circuitId&&c.simulationAvailability==='available');
  const visited=useRef(false);if(isShanghai)visited.current=true;if(isSharedExperience)visited.current=false;
  const isGenericMap=route.level==='circuit'&&!isShanghai&&!isSharedExperience&&route.mode==='overview'&&circuitRegistry.some(c=>c.circuitId===route.circuitId);
  return <>
    <WorldFlight/>
    {route.level==='catalog'&&<CatalogPage/>}
    <ErrorBoundary><Suspense fallback={<div className="loading">{t("正在载入赛道…")}</div>}>
      {route.level==='atlas'&&<AtlasVenuePage venueId={route.venueId}/>}
      {visited.current&&!isSharedExperience&&<ShanghaiHost active={!!isShanghai} mode={isShanghai&&route.level==='circuit'?route.mode:useApp.getState().mode} zoneId={isShanghai&&route.level==='circuit'?route.zoneId:useApp.getState().selection.zoneId??'a'}/>}
      {isSharedExperience&&route.level==='circuit'&&<CircuitExperience key={route.circuitId} circuitId={route.circuitId} mode={route.mode} zoneId={route.zoneId}/>}
      {isGenericMap&&route.level==='circuit'&&<CircuitMapPage circuitId={route.circuitId}/>}
    </Suspense></ErrorBoundary>
    {route.level!=='catalog'&&route.level!=='atlas'&&!isShanghai&&!isSharedExperience&&!isGenericMap&&<div className="route-error"><h1>{t("找不到此赛道页面")}</h1><button onClick={()=>navigate('#/circuits')}>{t("返回赛道选择")}</button></div>}
  </>;
}
createRoot(document.getElementById('root')!).render(<App/>);
