import {useShallow} from 'zustand/react/shallow';
import {t} from "../i18n";
import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import {useCircuit,useCircuitStore} from '../app/CircuitContext';

import { projectVehicle } from "./Projection";

import { phoneSensor,zoomToFov } from "./PhoneCamera";

import { freezeMoment,shutterSpeeds } from "../camera/Exposure";
import { temporalCapture,type PhotoResult } from "../camera/TemporalCapture";
import type { PerspectiveCamera } from "three";

export function CaptureBridge() {
  const useApp=useCircuitStore();
  const runtime=useCircuit(),{vehicle:carObject,simulation,shutter}=runtime;
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let alive=true;
    const capture = async () => {
      if(shutter.busy)throw Error(t("照片正在生成"));
      shutter.busy=true;
      try {
      const settings=useApp.getState();
      {
        if(!carObject.current)throw Error(t("赛车尚未就绪"));
        const frozenCamera=(camera as PerspectiveCamera).clone();
        frozenCamera.fov=zoomToFov(settings.zoom);frozenCamera.aspect=4/3;frozenCamera.updateProjectionMatrix();frozenCamera.updateMatrixWorld(true);
        const moment=freezeMoment(simulation,frozenCamera,settings.shutterSpeed,settings.panMode,runtime);
        const result=await temporalCapture(gl,scene,camera as PerspectiveCamera,carObject.current,moment,phoneSensor.baseFocal*settings.zoom,()=>alive&&useApp.getState().mode==='phone');
        if(result.metadata){
          result.metadata.zoneId=settings.selection.zoneId??'a';
          result.metadata.observerPosture=runtime.spectators.zoneById(settings.selection.zoneId!)?.kind==='grandstand'?'seated':'standing';
          result.metadata.eyeHeightMetres=moment.position.y-runtime.observerFloor(settings.selection).y;
          result.metadata.observerPosition=moment.position.toArray();
        }
        return result;
      }
      } finally {shutter.busy=false}
    };
    shutter.capture=capture;
    return () => {
      alive=false;
      if(shutter.capture===capture)shutter.capture = null;
    };
  }, [gl, scene, camera]);
  return null;
}
function FrameStats() {
  const useApp=useCircuitStore();
  const {camera:activeCamera,vehicle:carObject}=useCircuit();
  const [tick, update] = useState(0);
  useEffect(() => {
    const id = setInterval(() => update((x) => x + 1), 100);
    return () => clearInterval(id);
  }, []);
  const p =
    activeCamera.current && carObject.current
      ? projectVehicle(carObject.current, activeCamera.current)
      : null;
  return (
    <div className="frame-stats" data-tick={tick}> {t("赛车横向占比")} <b>{p?.widthPercent.toFixed(1) ?? "0.0"}%</b> ·{" "}
      {p?.state === "inside"
        ? t("画面内")
        : p?.state === "cropped"
          ? t("部分裁切")
          : t("画面外")}
    </div>
  );
}
function PhonePlayback() {
  const useApp=useCircuitStore();
  const {simulation,preparePass:prepareLocalPass}=useCircuit();
  const [tick, update] = useState(0);
  useEffect(() => {
    const id = setInterval(() => update((x) => x + 1), 150);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="phone-playback" data-tick={tick}>
      <button
        onClick={() => {
          if (simulation.status === "running") simulation.pause();
          else {
            if (simulation.status === "ended") simulation.replay();
            prepareLocalPass(useApp.getState().selection);
            simulation.play();
          }
          update((x) => x + 1);
        }}
      >
        {simulation.status === "running"
          ? t("暂停赛车")
          : simulation.status === "ended"
            ? t("重播赛车")
            : t("播放赛车")}
      </button>
      <span>{simulation.speed} km/h</span>
      <button
        onClick={() => {
          simulation.replay();
          update((x) => x + 1);
        }}
      > {t("重置")} </button>
    </div>
  );
}
export function PhoneControls() {
  const useApp=useCircuitStore();
  const {shutter}=useCircuit();
  const mode = useApp((s) => s.mode),
    setMode = useApp((s) => s.setMode),
    zoom = useApp((s) => s.zoom),
    setZoom = useApp((s) => s.setZoom);
  const {shutterSpeed,setShutterSpeed,panMode,setPanMode,circuitId}=useApp(useShallow(s=>({shutterSpeed:s.shutterSpeed,setShutterSpeed:s.setShutterSpeed,panMode:s.panMode,setPanMode:s.setPanMode,circuitId:s.circuitId})));
  const [photo, setPhoto] = useState<PhotoResult | null>(null),
    [error, setError] = useState("");
  const [busy,setBusy]=useState(false);
  if (mode !== "phone") return null;
  return (
    <>
      <div className="phone-caption">
        <span>{t("照片 / 4:3")}</span>
        <span>{(phoneSensor.baseFocal * zoom).toFixed(0)} mm</span>
      </div>
      <section className="phone-controls">
        <div className="camera-bar" aria-label={t("拍摄参数")}>
          <label>{t("快门")}<select aria-label={t("快门速度")} value={shutterSpeed} disabled={busy} onChange={e=>setShutterSpeed(+e.target.value)}>{shutterSpeeds.map(s=><option key={s} value={s}>1/{s} s</option>)}</select></label>
          <div role="group" aria-label={t("跟拍方式")}><button aria-label={t("固定镜头")} aria-pressed={panMode==='fixed'} disabled={busy} onClick={()=>setPanMode('fixed')}><span className="pan-full">{t("固定镜头")}</span><span className="pan-compact" aria-hidden="true">{t('固定')}</span></button><button aria-label={t("理想跟拍")} aria-pressed={panMode==='tracking'} disabled={busy} onClick={()=>setPanMode('tracking')}><span className="pan-full">{t("理想跟拍")}</span><span className="pan-compact" aria-hidden="true">{t('跟拍')}</span></button></div>
        </div>
        <div className="zoom-presets" role="group" aria-label={t("变焦倍率")}>
          <label className="zoom-range"><input aria-label={t("连续变焦")} aria-valuetext={`${zoom.toFixed(2)}× · ${(phoneSensor.baseFocal*zoom).toFixed(0)} mm`} type="range" min="0.5" max="30" step="0.01" value={zoom} onChange={e=>setZoom(+e.target.value)}/><output>{zoom.toFixed(1)}×</output></label>
          {[0.5, 1, 2, 3, 5, 10, 20].map((z) => (
            <button
              className={zoom === z ? "active" : ""}
              aria-pressed={zoom === z}
              key={z}
              onClick={() => setZoom(z)}
            >
              {z}×
            </button>
          ))}
        </div>
        <div className="capture-row">
          <button onClick={() => setMode("eye")}>{t("返回肉眼")}</button>
          <button
            className="shutter"
            aria-label={t("拍照")}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                if (!shutter.capture) throw Error(t("画面尚未就绪"));
                setPhoto(await shutter.capture());
                setError("");
              } catch (e) {
                setError(String(e));
              } finally {setBusy(false)}
            }}
          >
            <i />
          </button>
          <details className="phone-settings">
            <summary>{t("取景设置")}</summary>
            <div className="camera-settings-panel">
              <h3>{t("取景设置")}</h3>{" "}
              <FrameStats />
              <p>{t("4:3 · 等效焦距取景，不预测手机画质")}</p>
            </div>
          </details>
        </div>
        <PhonePlayback />
        {busy&&<p className="capture-status" role="status">{t("正在生成照片…")}</p>}

        {error && <p role="alert">{error}</p>}
      </section>
      {photo && (
        <div
          className="photo-modal"
          role="dialog"
          aria-label={t("照片预览")}
          aria-modal="true"
        >
          <div>
            <div className="panel-title"> {t("照片预览")} <button onClick={() => setPhoto(null)}>{t("关闭预览")}</button>
            </div>
            <img src={photo.url} alt={circuitId==='shanghai'?t("上海赛车场模拟照片"):t("赛道模拟照片")} data-exposure={photo.metadata?JSON.stringify(photo.metadata):undefined}/>
            {photo.metadata&&<p className="photo-settings">{photo.metadata.focal.toFixed(0)} mm · 1/{photo.metadata.shutter} s · {photo.metadata.pan==='tracking'?t("理想跟拍"):t("固定镜头")}{photo.metadata.velocity===0?t(" · 赛车静止"):''}</p>}
            <a
              href={photo.url}
              download={photo.metadata?`${circuitId}-${photo.metadata.zoneId}-1-${photo.metadata.shutter}-${photo.metadata.pan}.png`:`${circuitId}-spectator.png`}
              className="download"
            > {t("保存 PNG ↓")} </a>
          </div>
        </div>
      )}
    </>
  );
}
