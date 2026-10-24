import {t} from "./i18n";
import { ErrorScreen } from "./systems/ErrorBoundary";
import { simulation } from "./systems/VehicleSimulation";
import { useMemo, useEffect, useLayoutEffect, useState, useRef } from "react";
import { Object3D } from "three";
import { observer } from "./systems/GrandstandGeometry";

import { useThree, useFrame, Canvas } from "@react-three/fiber";
import { ribbon } from "./systems/CircuitGeometry";
import {
  Markers,
  Grandstand,
  TrackFacilities,
} from "./systems/TrackFacilities";
import { ObserverCamera, overviewPosition } from "./systems/ObserverCamera";

import { facilities as f } from "./data/config";
import { CaptureBridge,shutter } from "./systems/PhoneControls";
import { Vehicle } from "./systems/Vehicle";
import { CornerMarkers } from "./components/CornerMarkers";
import * as shanghaiGeometry from "./systems/CircuitGeometry";
import shanghaiData from "./circuits/generated/shanghai.json";
import type { CircuitPackage } from "./circuits/types";
import { useApp } from "./store";
import { SpectatorAreas } from "./systems/SpectatorAreas";
import {ShanghaiLabelLayout} from "./components/ShanghaiLabelLayout";
import {ExposurePreview} from './camera/ExposurePreview';
import {Terrain} from './components/Terrain';
import {shanghaiFoundations} from './circuits/shanghai/terrain';
import {TimingLayer} from './components/TimingLayer';
import {shanghaiTimingSource} from './circuits/shanghai/timing';
function Sun(){
  const selection=useApp(s=>s.selection),point=observer(selection);
  const target=useMemo(()=>new Object3D(),[]);
  useLayoutEffect(()=>{target.position.set(point.x,0,point.z);target.updateMatrixWorld(true)},[target,point.x,point.z]);
  return <><primitive object={target}/><directionalLight position={[point.x+100,500,point.z+100]} target={target} intensity={2.4} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-180} shadow-camera-right={180} shadow-camera-top={180} shadow-camera-bottom={-180} shadow-camera-near={1} shadow-camera-far={1000} shadow-bias={-.00015} shadow-normalBias={.04}/></>;
}

function Scene({ active = true }: { active?: boolean }) {
  const mode=useApp(s=>s.mode),colored=useApp(s=>s.terrainColored);
  const road = useMemo(() => ribbon(f.roadWidth, 0.2), []);
  const verge = useMemo(() => ribbon(f.roadWidth + 4, 0.1), []);
  return (
    <>
      <color attach="background" args={[mode==='eye'||mode==='phone'?'#a7b2b0':'#161b20']} />
      <ambientLight intensity={1.6} />
      <Sun/>
      {(mode==='eye'||mode==='phone')&&<mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[300, -1, -400]}>
        <planeGeometry args={[12000, 12000]} />
        <meshStandardMaterial color="#3e4b43" />
      </mesh>}
      <Terrain data={shanghaiData as unknown as CircuitPackage} geometry={shanghaiGeometry} foundations={shanghaiFoundations} colored={mode==='overview'&&colored}/>
      <mesh receiveShadow geometry={verge}>
        <meshStandardMaterial
          color="#b6b7ac"
          side={2}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      <mesh receiveShadow geometry={road}>
        <meshStandardMaterial
          color="#515457"
          side={2}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      <Grandstand />
      <SpectatorAreas active={active}/>
      <TrackFacilities />
      <TimingLayer data={shanghaiData as unknown as CircuitPackage} geometry={shanghaiGeometry} source={shanghaiTimingSource}/>
      <Markers />
      <ShanghaiLabelLayout/>
      {active && mode==='overview' && <CornerMarkers data={shanghaiData as unknown as CircuitPackage} geometry={shanghaiGeometry}/>}
      <ObserverCamera />
      <Vehicle active={active} />
      <CaptureBridge />
      <ExposurePreview active={active}/>
    </>
  );
}
export default function World({ active = true }: { active?: boolean }) {
  const [lost, setLost] = useState(false);
  return (
    <>
      <Canvas
        shadows
        frameloop={active ? "always" : "never"}
        camera={{
          position: overviewPosition(
            window.innerWidth / (window.innerHeight - 72),
          ).toArray(),
          near: 5,
          far: 12000,
          fov: 50,
        }}
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <ContextHealth active={active} onLost={() => setLost(true)} />
        <Scene active={active} />
      </Canvas>
      {lost && (
        <ErrorScreen
          title={t("WebGL 画面已中断")}
          message={t("赛车已暂停，可以重新加载场景恢复。")}
        />
      )}
    </>
  );
}
function ContextHealth({ onLost,active }: { onLost: () => void;active:boolean }) {
  const { gl, setDpr } = useThree();
  const frames = useRef({ time: performance.now(), count: 0, reduced: false,total:0 });
  useEffect(()=>{frames.current.time=performance.now();frames.current.count=0},[active]);
  useEffect(() => {
    const c = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      simulation.pause();
      onLost();
    };
    c.addEventListener("webglcontextlost", lost);
    return () => c.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  useFrame(() => {
    const f = frames.current;
    if (document.hidden || !active || shutter.busy) {
      f.time = performance.now();
      f.count = 0;
      return;
    }
    f.total++;gl.domElement.dataset.renderFrames=String(f.total);
    f.count++;
    if (f.count === 120) {
      const fps = 120000 / (performance.now() - f.time);
      gl.domElement.dataset.renderFps=fps.toFixed(1);
      if (fps < 35 && !f.reduced) {
        setDpr(0.8);
        f.reduced = true;
      }
      f.count = 0;
      f.time = performance.now();
    }
  });
  return null;
}
