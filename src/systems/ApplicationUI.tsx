import { SourceInfo } from "./SourceInfo";
import { useApp } from "../store";
import { observer } from "./GrandstandGeometry";
import { navigate } from "../app/navigation";
import { useEffect, useState } from "react";
import { spectatorZones,zoneById } from "../circuits/shanghai/spectators";
import {TransientPanels,useDismissPanel} from "../components/TransientPanels";
export function ApplicationUI() {
  const s = useApp();
  const [zonesOpen,setZonesOpen]=useState(false);
  useDismissPanel(zonesOpen,()=>setZonesOpen(false),".zone-preview");
  useEffect(()=>setZonesOpen(false),[s.mode]);
  const zoneId=s.selection.zoneId??'a',zone=zoneById(zoneId)!;
  const isA=zoneId==='a';
  const tierLabel=(tier:string)=>tier==='upper'?'上层':tier==='platinum'?'铂金区域':isA?'下层':zone.kind==='grass'?'草坡':'阶梯看台';
  const p = observer(s.selection);
  return (
    <>
      <TransientPanels/>
      <header className="experience-header">
        <button
          className="back-link"
          aria-label="← 选择赛道"
          onClick={() => navigate("#/circuits")}
        >
          ← <span>赛道集合</span>
        </button>
        <div className="experience-title">
          <span>上海国际赛车场</span>
          <small>
            {s.mode === "overview"
              ? "赛道鸟瞰"
              : `${zone.name} / ${tierLabel(s.selection.tier)}`}
          </small>
        </div>
        <div className="experience-brand">
          赛道图鉴 <SourceInfo />
        </div>
      </header>
      {s.mode === "overview" && (
        <>
          <div className="map-heading">
            <h1>上海</h1>
            <p>选择地图上的观赛区域，走进现场。</p>
          </div>
          <div className="map-tools">
            <button onClick={s.home} aria-label="恢复鸟瞰角度">
              ⟳
            </button>
            <span>左键 / WASD 平移 · 右键旋转 · 滚轮缩放</span>
          </div>
          <div className="zone-preview">
            <div>
              <h2>选择你的观赛区域</h2>
              <p>5 处看台 · 3 处草地</p>
            </div>
            <button className="primary" aria-expanded={zonesOpen} onClick={() => setZonesOpen(!zonesOpen)}>
              选择观察位置 ↗
            </button>
            {zonesOpen&&<div className="zone-list">{spectatorZones.map(z=><button key={z.zoneId} onClick={()=>{s.chooseZone(z.zoneId);s.setMode('select');setZonesOpen(false)}}>{z.name}<span>↗</span></button>)}</div>}
          </div>
        </>
      )}
      {s.mode === "select" && (
        <aside className="selection">
          <div className="selection-heading">
            <div>
              <span className="overline">选择观察位置</span>
              <h2>{zone.name}</h2>
            </div>
            <button
              aria-label="关闭选点"
              className="icon-button"
              onClick={() => s.setMode("overview")}
            >
              ×
            </button>
          </div>
          {isA&&<div className="tier-buttons" role="group" aria-label="A 看台分层">{(['lower','upper','platinum'] as const).map(tier=><button key={tier} aria-pressed={s.selection.tier===tier} onClick={()=>s.select({...s.selection,tier})}>{tierLabel(tier)}</button>)}</div>}
          <div className="selection-stats">
            <span>眼高约 {p.y.toFixed(1)} m</span>
          </div>
          <div className="selection-actions"><button className="primary" onClick={()=>s.setMode('eye')}>进入此处视野 ↗</button><button className="secondary" onClick={()=>s.setMode('phone')}>进入相机 ◎</button></div>
          <p className="small-note">{zoneId==='c'?'草地边界为估计':s.selection.tier==='platinum'?'铂金范围为估计':''}</p>
        </aside>
      )}
      {s.mode === "eye" && (
        <div className="view-tools">
          <button aria-label="赛道总览" onClick={()=>s.setMode("overview")}>返回地图</button>
          <button onClick={() => s.setMode("select")}>重新选点</button>
          <button onClick={s.home}>{isA?'看向主直道':'看向赛道'}</button>
          <button
            className="camera-entry"
            aria-label="打开手机相机"
            onClick={() => s.setMode("phone")}
          >
            ◎ <span>拿起相机</span>
          </button>
        </div>
      )}
      <div className="experience-footnote">
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      </div>
    </>
  );
}
