import {CircuitContextCache} from './app/CircuitContextCache';
import {t} from "./i18n";
import { lazy, Suspense, useEffect, useRef, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
const CircuitExperience=lazy(()=>import("./app/CircuitExperience"));

const CircuitMapPage = lazy(() => import("./pages/CircuitMapPage"));
import { parseRoute, navigate } from "./app/navigation";
import { CatalogPage } from "./pages/CatalogPage";
const AtlasVenuePage=lazy(()=>import('./pages/AtlasVenuePage'));
import { circuitRegistry } from "./circuits/registry";
import { ErrorBoundary } from "./systems/ErrorBoundary";

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
function App() {
  const language=useLanguage(s=>s.language);
  useEffect(()=>{document.documentElement.lang=language==='en'?'en':'zh-CN';document.title=language==='en'?'Circuit Atlas · Race views and photography':'赛道图鉴 · 世界赛道与观赛视野'},[language]);
  const hash=useSyncExternalStore(subscribe,()=>location.hash,()=>''),route=parseRoute(hash);
  const contexts=useRef(new CircuitContextCache());
  const isSharedExperience=route.level==='circuit'&&circuitRegistry.some(c=>c.circuitId===route.circuitId&&c.simulationAvailability==='available');
  const isGenericMap=route.level==='circuit'&&!isSharedExperience&&route.mode==='overview'&&circuitRegistry.some(c=>c.circuitId===route.circuitId);
  return <>
    <WorldFlight/>
    {route.level==='catalog'&&<CatalogPage/>}
    <ErrorBoundary key={route.level==='circuit'?route.circuitId:route.level}><Suspense fallback={<div className="loading">{t("正在载入赛道…")}</div>}>
      {route.level==='atlas'&&<AtlasVenuePage venueId={route.venueId}/>}
      {isSharedExperience&&route.level==='circuit'&&<CircuitExperience key={route.circuitId} circuitId={route.circuitId} mode={route.mode} zoneId={route.zoneId} contexts={contexts.current}/>}
      {isGenericMap&&route.level==='circuit'&&<CircuitMapPage circuitId={route.circuitId}/>}
    </Suspense></ErrorBoundary>
    {route.level!=='catalog'&&route.level!=='atlas'&&!isSharedExperience&&!isGenericMap&&<div className="route-error"><h1>{t("找不到此赛道页面")}</h1><button onClick={()=>navigate('#/circuits')}>{t("返回赛道选择")}</button></div>}
  </>;
}
createRoot(document.getElementById('root')!).render(<App/>);
