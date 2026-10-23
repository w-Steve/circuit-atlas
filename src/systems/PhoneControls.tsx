import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useApp } from "../store";
import { activeCamera } from "./ObserverCamera";
import { carObject } from "./Vehicle";
import { projectVehicle } from "./Projection";
import { simulation } from "./VehicleSimulation";
import { phoneSensor,zoomToFov } from "./PhoneCamera";
import { prepareLocalPass } from "./PassController";
import { freezeMoment,shutterSpeeds } from "../camera/Exposure";
import { temporalCapture,type PhotoResult } from "../camera/TemporalCapture";
import type { PerspectiveCamera } from "three";
export const shutter: { capture: null | (() => Promise<PhotoResult>);busy:boolean } = { capture: null,busy:false };
export function CaptureBridge() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let alive=true;
    shutter.capture = async () => {
      if(shutter.busy)throw Error('照片正在生成');
      shutter.busy=true;
      try {
      const settings=useApp.getState();
      {
        if(!carObject.current)throw Error('赛车尚未就绪');
        const frozenCamera=(camera as PerspectiveCamera).clone();
        frozenCamera.fov=zoomToFov(settings.zoom);frozenCamera.aspect=4/3;frozenCamera.updateProjectionMatrix();frozenCamera.updateMatrixWorld(true);
        const moment=freezeMoment(simulation,frozenCamera,settings.shutterSpeed,settings.panMode);
        const result=await temporalCapture(gl,scene,camera as PerspectiveCamera,carObject.current,moment,phoneSensor.baseFocal*settings.zoom,()=>alive&&useApp.getState().mode==='phone');
        if(result.metadata)result.metadata.zoneId=settings.selection.zoneId??'a';
        return result;
      }
      } finally {shutter.busy=false}
    };
    return () => {
      alive=false;
      shutter.capture = null;
    };
  }, [gl, scene, camera]);
  return null;
}
function FrameStats() {
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
    <div className="frame-stats" data-tick={tick}>
      赛车横向占比 <b>{p?.widthPercent.toFixed(1) ?? "0.0"}%</b> ·{" "}
      {p?.state === "inside"
        ? "画面内"
        : p?.state === "cropped"
          ? "部分裁切"
          : "画面外"}
    </div>
  );
}
function PhonePlayback() {
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
          ? "暂停赛车"
          : simulation.status === "ended"
            ? "重播赛车"
            : "播放赛车"}
      </button>
      <span>{simulation.speed} km/h</span>
      <button
        onClick={() => {
          simulation.replay();
          update((x) => x + 1);
        }}
      >
        重置
      </button>
    </div>
  );
}
export function PhoneControls() {
  const mode = useApp((s) => s.mode),
    setMode = useApp((s) => s.setMode),
    zoom = useApp((s) => s.zoom),
    setZoom = useApp((s) => s.setZoom);
  const {shutterSpeed,setShutterSpeed,panMode,setPanMode,circuitId}=useApp();
  const [photo, setPhoto] = useState<PhotoResult | null>(null),
    [error, setError] = useState("");
  const [busy,setBusy]=useState(false);
  if (mode !== "phone") return null;
  return (
    <>
      <div className="phone-caption">
        <span>照片 / 4:3</span>
        <span>{(phoneSensor.baseFocal * zoom).toFixed(0)} mm</span>
      </div>
      <section className="phone-controls">
        <div className="camera-bar" aria-label="拍摄参数">
          <label>快门<select aria-label="快门速度" value={shutterSpeed} disabled={busy} onChange={e=>setShutterSpeed(+e.target.value)}>{shutterSpeeds.map(s=><option key={s} value={s}>1/{s} s</option>)}</select></label>
          <div role="group" aria-label="跟拍方式"><button aria-pressed={panMode==='fixed'} disabled={busy} onClick={()=>setPanMode('fixed')}>固定镜头</button><button aria-pressed={panMode==='tracking'} disabled={busy} onClick={()=>setPanMode('tracking')}>理想跟拍</button></div>
        </div>
        <div className="zoom-presets">
          <label className="zoom-range"><input aria-label="连续变焦" type="range" min="0.5" max="30" step="0.01" value={zoom} onChange={e=>setZoom(+e.target.value)}/><output>{zoom.toFixed(1)}×</output></label>
          {[0.5, 1, 2, 3, 5, 10, 20].map((z) => (
            <button
              className={zoom === z ? "active" : ""}
              key={z}
              onClick={() => setZoom(z)}
            >
              {z}×
            </button>
          ))}
        </div>
        <div className="capture-row">
          <button onClick={() => setMode("eye")}>返回肉眼</button>
          <button
            className="shutter"
            aria-label="拍照"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                if (!shutter.capture) throw Error("画面尚未就绪");
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
            <summary>取景设置</summary>
            <div className="camera-settings-panel">
              <h3>取景设置</h3>{" "}
              <FrameStats />
              <p>4:3 · 等效焦距取景，不预测手机画质</p>
            </div>
          </details>
        </div>
        <PhonePlayback />
        {busy&&<p className="capture-status" role="status">正在生成照片…</p>}

        {error && <p role="alert">{error}</p>}
      </section>
      {photo && (
        <div
          className="photo-modal"
          role="dialog"
          aria-label="照片预览"
          aria-modal="true"
        >
          <div>
            <div className="panel-title">
              照片预览 <button onClick={() => setPhoto(null)}>关闭预览</button>
            </div>
            <img src={photo.url} alt={circuitId==='shanghai'?"上海赛车场模拟照片":"赛道模拟照片"} data-exposure={photo.metadata?JSON.stringify(photo.metadata):undefined}/>
            {photo.metadata&&<p className="photo-settings">{photo.metadata.focal.toFixed(0)} mm · 1/{photo.metadata.shutter} s · {photo.metadata.pan==='tracking'?'理想跟拍':'固定镜头'}{photo.metadata.velocity===0?' · 赛车静止':''}</p>}
            <a
              href={photo.url}
              download={photo.metadata?`${circuitId}-${photo.metadata.zoneId}-1-${photo.metadata.shutter}-${photo.metadata.pan}.png`:`${circuitId}-spectator.png`}
              className="download"
            >
              保存 PNG ↓
            </a>
          </div>
        </div>
      )}
    </>
  );
}
