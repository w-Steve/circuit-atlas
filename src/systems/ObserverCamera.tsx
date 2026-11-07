
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import { Box3, MOUSE } from "three";
import { OrbitControls } from "@react-three/drei";
import { Vector3, PerspectiveCamera, Quaternion } from "three";
import {useCircuit,useCircuitStore} from '../app/CircuitContext';

import { zoomToFov } from "./PhoneCamera";

import {selectionFraming,selectionEnvelopeProjection} from '../camera/selectionFraming';
import type {OrbitControls as Controls} from "three-stdlib";
import {MapKeyboard} from "../components/MapKeyboard";
import {circuitVisit} from '../app/circuitVisit';
export function ObserverCamera() {
  const useApp=useCircuitStore();
  const mode = useApp((s) => s.mode);
  const runtime=useCircuit(),{observer,lookTarget,camera:activeCamera,controls:activeMapControls,views:savedCircuitViews}=runtime;
  const overviewPosition=(aspect:number)=>{const span=runtime.bounds.getSize(new Vector3()),distance=Math.max(span.z,span.x/aspect)*1.3;return runtime.mapCenter.clone().add(new Vector3(0,distance,distance*.58))};
  const visit=circuitVisit(runtime.data.circuitId);
  const mapCenter=runtime.mapCenter;
  const resetView = useApp((s) => s.resetView);
  const zoneId=useApp(s=>s.selection.zoneId??'a');
  const selectedBounds=useMemo(()=>{
    const points:Vector3[]=[];
    for(const s of runtime.spectators.zoneSurfaces.get(zoneId)??[]){
      if(s.definition.terrainFollow){
        const mesh=runtime.spectators.surfaceGeometry(s);mesh.computeBoundingBox();
        points.push(mesh.boundingBox!.min.clone(),mesh.boundingBox!.max.clone().add(new Vector3(0,s.definition.eyeHeight,0)));mesh.dispose();
      }else for(const p of s.points)for(const y of [s.definition.baseHeight,s.definition.baseHeight+s.definition.rise+s.definition.eyeHeight])points.push(new Vector3(p.x,y,p.y));
    }
    return new Box3().setFromPoints(points);
  },[runtime,zoneId]);
  const selectedCenter=useMemo(()=>selectedBounds.getCenter(new Vector3()),[selectedBounds]);
  const controls=useRef<Controls>(null);
  const { camera, gl, size } = useThree();
  useEffect(()=>()=>{if(activeCamera.current===camera)activeCamera.current=null},[activeCamera,camera]);
  const target = useRef(new Vector3());
  const settled = useRef(false);
  const initialized=useRef(false);
  const flight=useRef<{from:Vector3;to:Vector3;fromTarget:Vector3;toTarget:Vector3;rotation:Quaternion;endRotation:Quaternion;elapsed:number}|null>(null);
  const viewKey=`${runtime.data.circuitId}:${mode}:${mode==='select'?zoneId:''}`;
  const lastReset=useRef(resetView);
  const lastVisit=useRef(visit);
  const previous=useRef({mode,zoneId});
  const fitted=useMemo(()=>{
    const selection={...useApp.getState().selection,zoneId,u:.5,v:.5};
    const towardTrack=lookTarget(selection).sub(observer(selection)).setY(0).normalize();
    return {...selectionFraming(selectedBounds,towardTrack,size.width,size.height),towardTrack};
  },[runtime,zoneId,selectedBounds,size.width,size.height]);
  useEffect(()=>{
    const mountedControls=controls.current;activeMapControls.current=mountedControls;
    return()=>{if(activeMapControls.current===mountedControls)activeMapControls.current=null};
  },[mode,zoneId,resetView]);
  // Map controls own the camera after initialization. A second per-frame lerp
  // fought OrbitControls' limits (especially on portrait screens) indefinitely.
  useLayoutEffect(()=>{
    settled.current=false;
    flight.current=null;
    const returning=(previous.current.mode==='eye'||previous.current.mode==='phone')&&mode==='select'&&previous.current.zoneId===zoneId;
    previous.current={mode,zoneId};
    if(mode!=='overview'&&mode!=='select')return;
    if(controls.current){
      // OrbitControls keeps inertial pan/rotation deltas even when disabled.
      // Flush those deltas without changing the visible start of this flight.
      const orbit=controls.current,p=camera.position.clone(),q=camera.quaternion.clone(),t=orbit.target.clone(),damping=orbit.enableDamping;
      orbit.enableDamping=false;orbit.update();orbit.enableDamping=damping;
      camera.position.copy(p);camera.quaternion.copy(q);orbit.target.copy(t);
    }
    const resetting=lastReset.current!==resetView||lastVisit.current!==visit;lastReset.current=resetView;lastVisit.current=visit;
    if(resetting)savedCircuitViews.delete(viewKey);
    const remembered=savedCircuitViews.get(viewKey);
    const saved=resetting||remembered?.visit!==visit||mode==='select'&&!returning?undefined:remembered;
    const fit=fitted,{towardTrack}=fitted;
    gl.domElement.dataset.selectionFacing=JSON.stringify({center:fit.target.toArray(),towardTrack:towardTrack.toArray()});
    // Selection looks into the seating from its track-facing side. The positive
    // offset puts the track behind the camera; eye/phone keep their own heading.
    const p=saved?new Vector3().fromArray(saved.position):mode==='overview'?overviewPosition(size.width/size.height)
      :fit.position;
    const t=saved?new Vector3().fromArray(saved.target):mode==='overview'?mapCenter:fit.target;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(initialized.current&&!reduced){
      const end=camera.clone();end.position.copy(p);end.lookAt(t);
      const fromTarget=controls.current?.target.clone()??camera.getWorldDirection(new Vector3()).multiplyScalar(Math.max(30,camera.position.distanceTo(t))).add(camera.position);
      flight.current={from:camera.position.clone(),to:p,fromTarget,toTarget:t.clone(),rotation:camera.quaternion.clone(),endRotation:end.quaternion.clone(),elapsed:0};
      if(controls.current)controls.current.enabled=false;
      gl.domElement.dataset.cameraReady='false';
    }else{
      camera.position.copy(p);camera.lookAt(t);
      controls.current?.target.copy(t);controls.current?.update();
      camera.updateMatrixWorld(true);settled.current=true;gl.domElement.dataset.cameraReady='true';
    }
    initialized.current=true;
    const view={position:camera.position.toArray(),target:t.toArray()};
    gl.domElement.dataset.mapView=JSON.stringify(view);
    gl.domElement.dataset.selectionMapView=JSON.stringify(view.position);
  },[mode,resetView,visit,zoneId,camera,gl,mapCenter,selectedCenter,selectedBounds,size.width,size.height,fitted]);
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
    const interruptFlight=()=>{if(flight.current){flight.current=null;settled.current=true;if(controls.current)controls.current.enabled=true}};
    const start = (e: PointerEvent) => {
      interruptFlight();
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
    // Html labels live outside the canvas. Forward map gestures so a label
    // under the pointer never becomes a dead spot for orbiting or zooming.
    const overLabel=(e:Event)=>e.target instanceof Element&&!!e.target.closest('#scene-labels .marker')&&['overview','select'].includes(useApp.getState().mode);
    const touches=new Set<number>(),labelTaps=new Map<number,{action:HTMLElement;x:number;y:number;moved:boolean}>();
    const labelPointer=(e:PointerEvent)=>{
      if(e.pointerType==='touch'){
        touches.add(e.pointerId);
        if(touches.size>1)labelTaps.forEach(t=>t.moved=true);
      }
      if(!overLabel(e)||(e.button===0&&e.pointerType!=='touch'))return;
      if(e.pointerType==='touch')labelTaps.set(e.pointerId,{action:(e.target as Element).closest<HTMLElement>('.marker')!,x:e.clientX,y:e.clientY,moved:touches.size>1});
      e.preventDefault();e.stopPropagation();
      canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:e.pointerId,pointerType:e.pointerType,isPrimary:e.isPrimary,button:e.button,buttons:e.buttons,clientX:e.clientX,clientY:e.clientY,ctrlKey:e.ctrlKey,shiftKey:e.shiftKey,metaKey:e.metaKey}));
    };
    const labelMove=(e:PointerEvent)=>{const t=labelTaps.get(e.pointerId);if(t&&Math.hypot(e.clientX-t.x,e.clientY-t.y)>4)t.moved=true};
    const labelEnd=(e:PointerEvent)=>{
      const t=labelTaps.get(e.pointerId);labelTaps.delete(e.pointerId);touches.delete(e.pointerId);
      if(t&&!t.moved&&e.type==='pointerup')queueMicrotask(()=>{if(t.action.isConnected)t.action.click()});
    };
    const labelWheel=(e:WheelEvent)=>{
      if(!overLabel(e))return;e.preventDefault();e.stopPropagation();
      canvas.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:e.clientX,clientY:e.clientY,deltaX:e.deltaX,deltaY:e.deltaY,deltaMode:e.deltaMode,ctrlKey:e.ctrlKey}));
    };
    document.addEventListener('pointerdown',labelPointer,true);
    document.addEventListener('pointermove',labelMove,true);
    document.addEventListener('pointerup',labelEnd,true);document.addEventListener('pointercancel',labelEnd,true);
    document.addEventListener('wheel',labelWheel,{capture:true,passive:false});
    canvas.addEventListener("pointerdown", start,true);
    canvas.addEventListener('wheel',interruptFlight,{capture:true,passive:true});
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    return () => {
      canvas.removeEventListener("pointerdown", start,true);
      canvas.removeEventListener('wheel',interruptFlight,true);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", end);
      document.removeEventListener('pointerdown',labelPointer,true);
      document.removeEventListener('pointermove',labelMove,true);
      document.removeEventListener('pointerup',labelEnd,true);document.removeEventListener('pointercancel',labelEnd,true);
      document.removeEventListener('wheel',labelWheel,true);
    };
  }, [gl]);
  useFrame((_, dt) => {
    const s = useApp.getState();
    gl.domElement.dataset.cameraMode=s.mode;
    const c = camera as PerspectiveCamera;
    activeCamera.current = c;
    initialized.current=true;
    if (s.mode === "eye" || s.mode === "phone") {
      const p = observer(s.selection);
      gl.domElement.dataset.observerPosition=JSON.stringify(p.toArray());
      camera.position.lerp(p, 1 - Math.exp(-dt * 7));
      const forward = lookTarget(s.selection).sub(p).normalize();
      const yaw = Math.atan2(forward.x, forward.z) + s.heading;
      const elevation=Math.max(-Math.PI/2+.02,Math.min(Math.PI/2-.02,s.pitch+Math.asin(forward.y)));
      target.current
        .copy(p)
        .add(
          new Vector3(
            Math.sin(yaw) * Math.cos(elevation),
            Math.sin(elevation),
            Math.cos(yaw) * Math.cos(elevation),
          ),
        );
      camera.up.set(0, 1, 0);
      target.current.sub(p).multiplyScalar(100).add(p);
      camera.lookAt(target.current);
      if (camera.position.distanceTo(p) < 0.01) camera.position.copy(p);
      gl.domElement.dataset.cameraReady = String(
        camera.position.equals(p),
      );
      c.near = 0.1;
      c.far = 20000;
      c.fov = s.mode === "phone" ? zoomToFov(s.zoom) : 60;
      c.aspect = s.mode === "phone" ? 4 / 3 : size.width / size.height;
      c.updateProjectionMatrix();
    } else {
      c.near=s.mode==='overview'?5:1;c.far=60000;c.fov=50;c.aspect=size.width/size.height;c.updateProjectionMatrix();
      const f=flight.current;
      if(f){
        f.elapsed+=Math.min(dt,.05);const progress=Math.min(1,f.elapsed/.85),ease=progress*progress*(3-2*progress);
        camera.position.lerpVectors(f.from,f.to,ease);camera.quaternion.slerpQuaternions(f.rotation,f.endRotation,ease);
        controls.current?.target.lerpVectors(f.fromTarget,f.toTarget,ease);
        if(progress===1){flight.current=null;settled.current=true;if(controls.current){controls.current.enabled=true;controls.current.update()}savedCircuitViews.set(viewKey,{position:camera.position.toArray(),target:f.toTarget.toArray(),visit})}
      }
      gl.domElement.dataset.cameraReady=String(!flight.current);
    }
    // Html and corner labels project this same frame's camera, before rendering.
    c.updateMatrixWorld(true);
    if(gl.domElement.dataset.gpuReady==='false')gl.domElement.dataset.cameraReady='false';
    if(s.mode==='select'&&gl.domElement.dataset.cameraReady==='true')gl.domElement.dataset.selectionFraming=JSON.stringify(selectionEnvelopeProjection(selectedBounds,c));
  },-.25);
  return mode === "overview" || mode === "select" ? (
    <>
    <OrbitControls
      ref={controls}
      mouseButtons={{LEFT:MOUSE.PAN,MIDDLE:MOUSE.DOLLY,RIGHT:MOUSE.ROTATE}}
      enableRotate
      enablePan
      dampingFactor={.15}
      screenSpacePanning={false}
      onChange={e=>{
        const orbit=e?.target as unknown as Controls;if(!orbit)return;
        const view={position:camera.position.toArray(),target:orbit.target.toArray()};
        gl.domElement.dataset.selectionMapView=JSON.stringify(view.position);
        gl.domElement.dataset.mapView=JSON.stringify(view);
        if(settled.current)savedCircuitViews.set(viewKey,{...view,visit});
      }}
      minPolarAngle={mode === "select" ? Math.PI * .12 : 0}
      maxPolarAngle={mode === "select" ? Math.PI * .44 : Math.PI / 2.05}
      minDistance={mode === "select" ? 60 : 25}
      maxDistance={mode === "select" ? Math.max(1000,fitted.distance*3) : 30000}
    />
    <MapKeyboard controls={controls}/>
    </>
  ) : null;
}
