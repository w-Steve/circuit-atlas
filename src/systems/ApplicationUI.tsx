import {zoneName} from '../i18n/data';
import {t} from "../i18n";
import { useApp } from "../store";
import { observer } from "./GrandstandGeometry";
import {ExperienceBack,VenueInfoLink} from '../components/ExperienceNavigation';
import { useEffect, useState } from "react";
import { spectatorZones,zoneById } from "../circuits/shanghai/spectators";
import {TransientPanels,useDismissPanel} from "../components/TransientPanels";
import {MapOrientation} from '../components/MapOrientation';
import {TimingLegend} from '../components/TimingLayer';
export function ApplicationUI() {
  const s = useApp();
  const [zonesOpen,setZonesOpen]=useState(false);
  useDismissPanel(zonesOpen,()=>setZonesOpen(false),".zone-preview");
  useEffect(()=>setZonesOpen(false),[s.mode]);
  const zoneId=s.selection.zoneId??'a',zone=zoneById(zoneId)!;
  const isA=zoneId==='a';
  const tierLabel=(tier:string)=>tier==='upper'?t("上层"):tier==='platinum'?t("铂金区域"):isA?t("下层"):zone.kind==='grass'?t("草坡"):t("阶梯看台");
  const p = observer(s.selection);
  return (
    <>
      <TransientPanels/>
      {(s.mode==='overview'||s.mode==='select')&&<MapOrientation/>}
      <header className="experience-header">
        <ExperienceBack/>
        <div className="experience-title">
          <span>{t("上海国际赛车场")}</span>
          <small>
            {s.mode === "overview"
              ? t("赛道鸟瞰")
              : `${zoneName(zone.name)} / ${tierLabel(s.selection.tier)}`}
          </small>
        </div>
        <div className="experience-brand">
          <VenueInfoLink/>
        </div>
      </header>
      {s.mode === "overview" && (
        <>
          <div className="map-heading">
            <h1>{t("上海")}</h1>
            <p>{t("选择地图上的观赛区域，走进现场。")}</p>
          </div>
          <div className="map-tools">
            <button onClick={s.home} aria-label={t("恢复鸟瞰角度")}>
              ⟳
            </button>
            <span>{t("左键 / WASD 平移 · 右键旋转 · 滚轮缩放")}</span>
            <TimingLegend/>
            <button className="terrain-toggle" aria-pressed={s.terrainColored} onClick={()=>s.setTerrainColored(!s.terrainColored)}>{s.terrainColored?t("高度配色 · 5m 等高线"):t("显示高度配色")}</button>
          </div>
          <div className="zone-preview">
            <div>
              <h2>{t("选择你的观赛区域")}</h2>
              <p>{t("5 处看台 · 3 处草地")}</p>
            </div>
            <button className="primary" aria-expanded={zonesOpen} onClick={() => setZonesOpen(!zonesOpen)}> {t("选择观察位置 ↗")} </button>
            {zonesOpen&&<div className="zone-list">{spectatorZones.map(z=><button key={z.zoneId} onClick={()=>{s.chooseZone(z.zoneId);s.setMode('select');setZonesOpen(false)}}>{zoneName(z.name)}<span>↗</span></button>)}</div>}
          </div>
        </>
      )}
      {s.mode === "select" && (
        <aside className="selection">
          <div className="selection-heading">
            <div>
              <span className="overline">{t("选择观察位置")}</span>
              <h2>{zoneName(zone.name)}</h2>
            </div>
            <button
              aria-label={t("关闭选点")}
              className="icon-button"
              onClick={() => s.setMode("overview")}
            >
              ×
            </button>
          </div>
          {isA&&<div className="tier-buttons" role="group" aria-label={t("A 看台分层")}>{(['lower','upper','platinum'] as const).map(tier=><button key={tier} aria-pressed={s.selection.tier===tier} onClick={()=>s.select({...s.selection,tier})}>{tierLabel(tier)}</button>)}</div>}
          <div className="selection-stats">
            <span>{t("眼高约")} {p.y.toFixed(1)} m</span>
          </div>
          <div className="selection-actions"><button className="primary" onClick={()=>s.setMode('eye')}>{t("进入此处视野 ↗")}</button><button className="secondary" onClick={()=>s.setMode('phone')}>{t("进入相机 ◎")}</button></div>
          <p className="small-note">{zoneId==='c'?t("草地边界为估计"):s.selection.tier==='platinum'?t("铂金范围为估计"):''}</p>
        </aside>
      )}
      {s.mode === "eye" && (
        <div className="view-tools">
          <button aria-label={t("赛道总览")} onClick={()=>s.setMode("overview")}>{t("返回地图")}</button>
          <button onClick={() => s.setMode("select")}>{t("重新选点")}</button>
          <button onClick={s.home}>{isA?t("看向主直道"):t("看向赛道")}</button>
          <button
            className="camera-entry"
            aria-label={t("打开手机相机")}
            onClick={() => s.setMode("phone")}
          >
            ◎ <span>{t("拿起相机")}</span>
          </button>
        </div>
      )}
      <div className="experience-footnote">
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      </div>
    </>
  );
}
