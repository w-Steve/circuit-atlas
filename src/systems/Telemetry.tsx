import {t} from "../i18n";

import { useEffect, useState, useMemo } from "react";
import {buildingReference} from '../circuits/facilityGeometry';
import { Vector3 } from "three";

import {useCircuit,useCircuitStore} from '../app/CircuitContext';

import { projectVehicle } from "./Projection";
import { angularVelocity } from "./MeasurementSystem";

export function Telemetry() {
  const useApp=useCircuitStore();
  const runtime=useCircuit(),{observer,simulation,cockpitAt,camera:activeCamera,vehicle:carObject,preparePass:prepareLocalPass}=runtime;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 100);
    return () => clearInterval(id);
  }, []);
  const s = useApp();
  const eye = observer(s.selection),
    car = cockpitAt(simulation.distance),
    projection =
      carObject.current && activeCamera.current
        ? projectVehicle(carObject.current, activeCamera.current)
        : null;
  const dist = eye.distanceTo(car),
    omega = angularVelocity(
      eye,
      car,
      cockpitAt(simulation.distance + 0.05)
        .sub(cockpitAt(simulation.distance - 0.05))
        .multiplyScalar(
          simulation.status === "running" ? simulation.speed / 3.6 / 0.1 : 0,
        ),
    );

  const facilityPit=useMemo(()=>{const building=runtime?.data.facilities?.buildings[0];return building?buildingReference(runtime.data,runtime.geometry,building):runtime.data.scene?.landmarks?.find(l=>l.role==='pit')?new Vector3(...runtime.data.scene.landmarks.find(l=>l.role==='pit')!.position):null},[runtime]);
  const pit=facilityPit??new Vector3();
  return (
    <section className="telemetry" data-tick={tick} aria-label={t("赛车控制")}>
      <div className="readings">
        <div>
          <small>{t("距离 · 约")}</small>
          <strong data-testid="car-distance">
            {dist.toFixed(1)}
            <em>m</em>
          </strong>
        </div>
        <div>
          <small>{t("当前速度")}</small>
          <strong>
            {simulation.status === "running" ? simulation.speed : 0}
            <em>km/h</em>
          </strong>
        </div>
      </div>
      <div className="play-controls">
        <button
          className="primary play-main"
          disabled={simulation.status === "ended"}
          onClick={() => {
            prepareLocalPass(s.selection);
            simulation.status === "running"
              ? simulation.pause()
              : simulation.play();
            setTick((x) => x + 1);
          }}
        >
          {simulation.status === "running"
            ? t("暂停")
            : simulation.status === "paused"
              ? t("继续")
              : t("播放赛车经过")}
        </button>
        <button
          className="replay-control"
          aria-label={t("重置 / 重播")}
          title={t("重置 / 重播")}
          onClick={() => {
            simulation.replay();
            prepareLocalPass(s.selection);
            setTick((x) => x + 1);
          }}
        >
          ↺
        </button>
        <details className="speed-menu">
          <summary aria-label={t("播放设置")}>
            {simulation.speed} <small>km/h</small>⌄
          </summary>
          <div className="control-popover">
            <label htmlFor="speed"> {t("演示速度")} <b>{simulation.speed} km/h</b>
            </label>
            <input
              id="speed"
              type="range"
              min="80"
              max="340"
              value={simulation.speed}
              onChange={(e) => {
                simulation.setSpeed(+e.target.value);
                setTick((x) => x + 1);
              }}
            />
          </div>
        </details>
        <details className="measure-menu">
          <summary>{t("测量")}</summary>
          <div className="control-popover">
            <h3>{t("当前位置的视野")}</h3>
            <dl>
              <div>
                <dt>{t("赛车视角 / 横向占比")}</dt>
                <dd>
                  {projection?.angularWidth.toFixed(1)}° /{" "}
                  {projection?.widthPercent.toFixed(1)}%
                </dd>
              </div>
              <div>
                <dt>{t("视线角速度")}</dt>
                <dd>{omega.toFixed(1)} °/s</dd>
              </div>
              {facilityPit&&<div><dt>{t(runtime.data.scene?.landmarks?.find(l=>l.role==='pit')?.measurementLabel??'P 房 · 建筑中心')}</dt><dd>{t("约")} {eye.distanceTo(pit).toFixed(0)} m</dd></div>}

              {runtime.timing&&<><div><dt>{t("发车线中心")}</dt><dd>{t("约")} {eye.distanceTo(runtime.geometry.at(runtime.timing.start)).toFixed(0)} m</dd></div><div><dt>{t("计时线中心")}</dt><dd>{t("约")} {eye.distanceTo(runtime.geometry.at(runtime.timing.control)).toFixed(0)} m</dd></div></>}
            </dl>
          </div>
        </details>
      </div>
      <p className="sr-only" aria-live="polite" data-testid="sim-status">
        {
          {
            ready: t("就绪 · 上游起点"),
            running: t("正在经过"),
            paused: t("已暂停"),
            ended: t("演示结束 · 请重置"),
          }[simulation.status]
        }
      </p>
      <output hidden data-testid="car-position"> {t("驾驶舱 X")} {car.x.toFixed(1)} · Y {car.y.toFixed(2)} · Z{" "}
        {car.z.toFixed(1)} m
      </output>
    </section>
  );
}
