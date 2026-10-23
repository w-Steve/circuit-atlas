import {circuitRuntime} from "../circuits/runtime";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { geoPoints } from "./CircuitGeometry";
import { Box3, MOUSE } from "three";
import { OrbitControls } from "@react-three/drei";
import { Vector3, PerspectiveCamera } from "three";
import { useApp } from "../store";
import { observer,lookTarget } from "./GrandstandGeometry";
import { zonePoint } from "../circuits/shanghai/spectators";
import { zoomToFov } from "./PhoneCamera";
import { local } from "../data/config";
import type {OrbitControls as Controls} from "three-stdlib";
import {MapKeyboard} from "../components/MapKeyboard";
export const overviewCenter = new Box3()
  .setFromPoints(geoPoints)
  .getCenter(new Vector3());
const overviewRadius = Math.max(
  ...geoPoints.map((p) => p.distanceTo(overviewCenter)),
);
export function overviewPosition(aspect: number) {
  if(circuitRuntime.current){
    const points=circuitRuntime.current.geometry.geoPoints,center=new Box3().setFromPoints(points).getCenter(new Vector3());
    const span=new Box3().setFromPoints(points).getSize(new Vector3());
    const distance=Math.max(span.z,span.x/aspect)*1.3;
    return center.add(new Vector3(0,distance,distance*.58));
  }
  const vertical = (50 * Math.PI) / 180,
    horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
  const distance =
    (overviewRadius / Math.sin(Math.min(vertical, horizontal) / 2)) * 1.12;
  return overviewCenter
    .clone()
    .add(new Vector3(1, 1.7, 1.3).normalize().multiplyScalar(distance));
}
export const activeCamera: { current: PerspectiveCamera | null } = {
  current: null,
};
const savedCircuitViews=new Map<string,{position:number[];target:number[]}>();
export function ObserverCamera() {
  const mode = useApp((s) => s.mode);
  const runtime=circuitRuntime.current;
  const mapCenter=useMemo(()=>runtime?new Box3().setFromPoints(runtime.geometry.geoPoints).getCenter(new Vector3()):overviewCenter,[runtime]);
  const resetView = useApp((s) => s.resetView);
  const zoneId=useApp(s=>s.selection.zoneId??'a');
  const selectedCenter=useMemo(()=>runtime?runtime.spectators.zonePoint(zoneId,.5,.5,false):zoneId==='a'?new Vector3(...local(0,10,25)):zonePoint(zoneId,.5,.5,false),[runtime,zoneId]);
  const controls=useRef<Controls>(null);
  const { camera, gl, size } = useThree();
  const target = useRef(new Vector3());
  const settled = useRef(false);
  const viewKey=`${runtime?.data.circuitId??'shanghai'}:${mode}:${mode==='select'?zoneId:''}`;
  const lastReset=useRef(resetView);
  // Map controls own the camera after initialization. A second per-frame lerp
  // fought OrbitControls' limits (especially on portrait screens) indefinitely.
  useLayoutEffect(()=>{
    settled.current=false;
    if(mode!=='overview'&&mode!=='select')return;
    const resetting=lastReset.current!==resetView;lastReset.current=resetView;
    if(resetting)savedCircuitViews.delete(viewKey);
    const saved=resetting?undefined:savedCircuitViews.get(viewKey);
    const p=saved?new Vector3().fromArray(saved.position):mode==='overview'?overviewPosition(size.width/size.height)
      :!runtime&&zoneId==='a'?new Vector3(...local(0,230,320)):selectedCenter.clone().add(new Vector3(0,130,170));
    const t=saved?new Vector3().fromArray(saved.target):mode==='overview'?mapCenter:selectedCenter;
    camera.position.copy(p);camera.lookAt(t);
    controls.current?.target.copy(t);controls.current?.update();
    camera.updateMatrixWorld(true);settled.current=true;gl.domElement.dataset.cameraReady='true';
    const view={position:camera.position.toArray(),target:t.toArray()};
    gl.domElement.dataset.mapView=JSON.stringify(view);
    gl.domElement.dataset.selectionMapView=JSON.stringify(view.position);
  },[mode,resetView,zoneId,camera,gl,mapCenter,selectedCenter]);
  useEffect(() => {
    const canvas = gl.domElement;
    let down = false,
      lastX = 0,
      lastY = 0;
    const move = (e: PointerEvent) => {
      if (down) {
        useApp
          .getState()
          .look(-(e.clientX - lastX) * 0.003, -(e.clientY - lastY) * 0.003);
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    const start = (e: PointerEvent) => {
      if (["eye", "phone"].includes(useApp.getState().mode)) {
        down = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      }
    };
    const end = () => {
      down = false;
    };
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    return () => {
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", end);
    };
  }, [gl]);
  useFrame((_, dt) => {
    const s = useApp.getState();
    const c = camera as PerspectiveCamera;
    activeCamera.current = c;
    if (s.mode === "eye" || s.mode === "phone") {
      const p = observer(s.selection);
      gl.domElement.dataset.observerPosition=JSON.stringify(p.toArray());
      camera.position.lerp(p, 1 - Math.exp(-dt * 7));
      const forward = lookTarget(s.selection).sub(p).normalize();
      const yaw = Math.atan2(forward.x, forward.z) + s.heading;
      target.current
        .copy(p)
        .add(
          new Vector3(
            Math.sin(yaw) * Math.cos(s.pitch + Math.asin(forward.y)),
            Math.sin(s.pitch + Math.asin(forward.y)),
            Math.cos(yaw) * Math.cos(s.pitch + Math.asin(forward.y)),
          ),
        );
      camera.up.set(0, 1, 0);
      target.current.sub(p).multiplyScalar(100).add(p);
      camera.lookAt(target.current);
      if (camera.position.distanceTo(p) < 0.01) camera.position.copy(p);
      gl.domElement.dataset.cameraReady = String(
        camera.position.distanceTo(p) < 0.02,
      );
      c.near = 0.1;
      c.far = runtime?20000:12000;
      c.fov = s.mode === "phone" ? zoomToFov(s.zoom) : 60;
      c.aspect = s.mode === "phone" ? 4 / 3 : size.width / size.height;
      c.updateProjectionMatrix();
    } else {
      c.near=s.mode==='overview'?5:1;c.far=60000;c.fov=50;c.aspect=size.width/size.height;c.updateProjectionMatrix();
      gl.domElement.dataset.cameraReady='true';
    }
    // Html and corner labels project this same frame's camera, before rendering.
    c.updateMatrixWorld(true);
  },-.25);
  return mode === "overview" || mode === "select" ? (
    <>
    <OrbitControls
      ref={controls}
      mouseButtons={{LEFT:MOUSE.PAN,MIDDLE:MOUSE.DOLLY,RIGHT:MOUSE.ROTATE}}
      key={`${mode}-${zoneId}-${resetView}`}
      enableRotate
      enablePan
      dampingFactor={.15}
      screenSpacePanning={false}
      onChange={e=>{
        const orbit=e?.target as unknown as Controls;if(!orbit)return;
        const view={position:camera.position.toArray(),target:orbit.target.toArray()};
        gl.domElement.dataset.selectionMapView=JSON.stringify(view.position);
        gl.domElement.dataset.mapView=JSON.stringify(view);
        if(settled.current)savedCircuitViews.set(viewKey,view);
      }}
      minPolarAngle={mode === "select" ? Math.PI * .12 : 0}
      maxPolarAngle={mode === "select" ? Math.PI * .44 : Math.PI / 2.05}
      minDistance={mode === "select" ? 60 : 25}
      maxDistance={mode === "select" ? 1000 : 30000}
    />
    <MapKeyboard controls={controls}/>
    </>
  ) : null;
}
