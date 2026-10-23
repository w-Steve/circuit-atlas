import { navigate } from "./navigation";
import { lazy, Suspense,useEffect,useRef } from "react";
import { simulation,passStart,passEnd } from "../systems/VehicleSimulation";
import { zonePassCenter } from "../circuits/shanghai/spectators";

import { useApp } from "../store";
import { ApplicationUI } from "../systems/ApplicationUI";
import { Telemetry } from "../systems/Telemetry";
import { PhoneControls } from "../systems/PhoneControls";
import { ErrorBoundary } from "../systems/ErrorBoundary";

const World = lazy(() => import("../World"));
export function ShanghaiExperience({ active = true }: { active?: boolean }) {
  const mode = useApp((s) => s.mode);
  const zone=useApp(s=>s.selection.zoneId??'a');
  const lastZone=useRef(zone);
  useEffect(()=>{
    if(lastZone.current===zone&&simulation.status!=='ready')return;
    lastZone.current=zone;
    if(zone==='a')simulation.setPassRange(passStart,passEnd);
    else {const center=zonePassCenter(zone);simulation.setPassRange(center-350,center+450)}
  },[zone]);
  return (
    <main
      className={`${active ? "" : "route-hidden"} mode-${mode} ${mode === "phone" ? "phone-mode" : ""}`}
    >
      <div className="world">
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="loading" role="status">
                正在建立米制三维场景…
              </div>
            }
          >
            <World active={active} />
          </Suspense>
        </ErrorBoundary>
      </div>
      <div id="scene-labels" />
      <ApplicationUI />
      <Telemetry />
      <PhoneControls />
    </main>
  );
}
