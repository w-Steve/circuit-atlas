import {t,tr} from "../i18n";
import {memo,useEffect,useRef,useState,type CSSProperties,type MouseEvent} from 'react';
import land from '../assets/world-land.json';
import {atlasVenues,venuePath,venueYearsLabel} from '../atlas';
import {circuitPath} from '../app/navigation';
import {localizeVenue} from '../i18n/data';
import {CircuitOutline} from './CircuitOutline';
import './WorldCircuitMap.css';
import {startWorldFlight,useWorldFlight,formatCoordinate} from '../app/worldFlight';
export const projectWorld=([lon,lat]:readonly number[])=>({x:(lon+180)*1200/360,y:(82-lat)*1200/360});
const MAX_ZOOM=24;
type View={zoom:number;x:number;y:number};
let rememberedView:View={zoom:1,x:0,y:0},rememberedSelection='shanghai';
type Point={x:number;y:number};
const Land=memo(()=> <>{land.map((d,i)=><path key={i} d={d} fillRule="evenodd"/>)}</>);
const entries=atlasVenues.map(c=>({...c,...projectWorld(c.coordinate)}));
const destination=(c:typeof entries[number])=>c.modelId?circuitPath(c.modelId):venuePath(c);
export function WorldCircuitMap(){
 const host=useRef<HTMLDivElement>(null),[size,setSize]=useState({width:1200,height:500});
 const [view,setView]=useState<View>(()=>({...rememberedView})),current=useRef(view),[selected,setSelected]=useState(rememberedSelection);
 useEffect(()=>{rememberedSelection=selected},[selected]);
 const [locating,setLocating]=useState(false),flight=useWorldFlight(s=>s.flight);
 const [nearby,setNearby]=useState<typeof entries>([]),nearbyPanel=useRef<HTMLDivElement>(null);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(!nearbyPanel.current?.contains(e.target as Node)&&!(e.target as Element).closest('.world-cluster'))setNearby([])};const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setNearby([])};document.addEventListener('pointerdown',close,true);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',close,true);document.removeEventListener('keydown',key)}},[]);
 const pointers=useRef(new Map<number,Point>()),gesture=useRef<{center:Point;distance:number}|null>(null);
 const base=Math.min(size.width/1200,size.height/500),scale=base*view.zoom,center={x:size.width/2,y:size.height*(size.width<650?.38:.5)};
 const actions=useRef(new Map<number,HTMLElement>()),moved=useRef(false),origins=useRef(new Map<number,Point>());
 const commit=(next:View)=>{
  const zoom=Math.min(MAX_ZOOM,Math.max(1,next.zoom));
  const bx=Math.max(0,(1200*base*zoom-size.width)/2)+size.width*.3,by=Math.max(0,(500*base*zoom-size.height)/2)+size.height*.25;
  const v={zoom,x:Math.max(-bx,Math.min(bx,next.x)),y:Math.max(-by,Math.min(by,next.y))};current.current=v;rememberedView=v;setView(v);
 };
 const zoomAt=(factor:number,p:Point=center)=>{
  const v=current.current,z=Math.max(1,Math.min(MAX_ZOOM,v.zoom*factor)),r=z/v.zoom;
  commit({zoom:z,x:p.x-center.x-(p.x-center.x-v.x)*r,y:p.y-center.y-(p.y-center.y-v.y)*r});
 };
 useEffect(()=>{const r=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));r.observe(host.current!);return()=>r.disconnect()},[]);
 useEffect(()=>{
  const element=host.current!;
  const wheel=(e:WheelEvent)=>{e.preventDefault();const r=element.getBoundingClientRect();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?size.height:1);zoomAt(Math.exp(-Math.max(-300,Math.min(300,delta))*.002),{x:e.clientX-r.left,y:e.clientY-r.top})};
  element.addEventListener('wheel',wheel,{passive:false});return()=>element.removeEventListener('wheel',wheel);
 },[size]);
 const snapshot=()=>{const ps=[...pointers.current.values()];return ps.length?{center:ps.length===1?ps[0]:{x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2},distance:ps.length<2?0:Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)}:null};
 const finish=(id:number,tap=false)=>{const action=actions.current.get(id);pointers.current.delete(id);actions.current.delete(id);origins.current.delete(id);gesture.current=snapshot();if(tap&&!moved.current&&action)action.click()};
 const screen=(p:Point)=>({x:(p.x-600)*scale+center.x+view.x,y:(p.y-250)*scale+center.y+view.y});
 // Clustering is recomputed in screen space. Individual anchors always remain
 // attached to the circuit's geographic coordinate, never displaced as labels.
 const groups:{x:number;y:number;members:typeof entries}[]=[];
 for(const entry of entries)groups.push({...screen(entry),members:[entry]});
 const threshold=size.width<650?42:32;
 let merged=true;
 while(merged){merged=false;for(let i=0;i<groups.length&&!merged;i++)for(let j=i+1;j<groups.length;j++)if(Math.hypot(groups[i].x-groups[j].x,groups[i].y-groups[j].y)<threshold){
  const members=[...groups[i].members,...groups[j].members];groups[i]={x:members.reduce((s,m)=>s+screen(m).x,0)/members.length,y:members.reduce((s,m)=>s+screen(m).y,0)/members.length,members};groups.splice(j,1);merged=true;break;
 }}
 const inFrame=(p:Point)=>p.x>=0&&p.x<=size.width&&p.y>=0&&p.y<=size.height;
 const active=localizeVenue(entries.find(c=>c.id===selected)!),target=screen(active);
 const locate=(id:string)=>{setSelected(id);setLocating(true)};
 const depart=(c:typeof entries[number],e:MouseEvent<HTMLAnchorElement>)=>{
  if(!c.modelId||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  e.preventDefault();locate(c.id);
  const p=screen(c),r=host.current!.getBoundingClientRect();
  startWorldFlight({href:destination(c),circuitId:c.modelId,name:localizeVenue(c).name,coordinate:c.coordinate,
   origin:{x:Math.max(0,Math.min(1,(r.left+p.x)/innerWidth)),y:Math.max(0,Math.min(1,(r.top+p.y)/innerHeight))},keyboard:e.detail===0});
 };
 const departing=flight?.href===destination(active),chartStyle={'--target-x':`${target.x}px`,'--target-y':`${target.y}px`} as CSSProperties;
 return <section onMouseLeave={()=>setLocating(false)} className="world-explorer" aria-label={t("全球赛道地图")}>
  <div className="world-map-viewport">
  <div className="world-map" ref={host} tabIndex={0} onContextMenu={e=>e.preventDefault()} onDragStart={e=>e.preventDefault()} aria-label={t("世界赛道地图，可拖动和缩放")} data-zoom={view.zoom.toFixed(3)} data-pan={`${view.x.toFixed(1)},${view.y.toFixed(1)}`}
   onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(['+','=','-','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();if(e.key==='+'||e.key==='=')zoomAt(1.4);if(e.key==='-')zoomAt(1/1.4);if(e.key==='Home')commit({zoom:1,x:0,y:0});const dx=e.key==='ArrowLeft'?60:e.key==='ArrowRight'?-60:0,dy=e.key==='ArrowUp'?60:e.key==='ArrowDown'?-60:0;if(dx||dy)commit({...current.current,x:current.current.x+dx,y:current.current.y+dy})}}
   onPointerDown={e=>{const action=(e.target as Element).closest<HTMLElement>('a,button');if(e.button>0||action&&e.pointerType!=='touch')return;if(!pointers.current.size)moved.current=false;else moved.current=true;e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top};pointers.current.set(e.pointerId,p);origins.current.set(e.pointerId,p);if(action)actions.current.set(e.pointerId,action);gesture.current=snapshot()}}
   onPointerMove={e=>{if(!pointers.current.has(e.pointerId))return;const r=e.currentTarget.getBoundingClientRect(),old=gesture.current!,p={x:e.clientX-r.left,y:e.clientY-r.top},origin=origins.current.get(e.pointerId)!;if(Math.hypot(p.x-origin.x,p.y-origin.y)>4)moved.current=true;pointers.current.set(e.pointerId,p);const next=snapshot()!,v=current.current;const z=Math.max(1,Math.min(MAX_ZOOM,v.zoom*(old.distance&&next.distance?next.distance/old.distance:1))),ratio=z/v.zoom;if(moved.current)commit({zoom:z,x:next.center.x-center.x-(old.center.x-center.x-v.x)*ratio,y:next.center.y-center.y-(old.center.y-center.y-v.y)*ratio});gesture.current=next}}
   onPointerUp={e=>finish(e.pointerId,true)} onPointerCancel={e=>finish(e.pointerId)} onLostPointerCapture={e=>finish(e.pointerId)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){pointers.current.clear();actions.current.clear();origins.current.clear();gesture.current=null}}}>
   <div className={`world-chart ${departing?'is-departing':''}`} style={chartStyle}>
   <svg width="100%" height="100%" aria-hidden="true" className="world-geography"><g transform={`translate(${center.x+view.x} ${center.y+view.y}) scale(${scale}) translate(-600 -250)`}>
    <g className="world-graticule">{[-150,-120,-90,-60,-30,0,30,60,90,120,150].map(l=><path key={l} d={`M${(l+180)*1200/360} 0V475`}/>)}{[-30,0,30,60].map(l=><path key={l} d={`M0 ${(82-l)*1200/360}H1200`}/>)}</g>
    <g className="world-land"><Land/></g>
   </g></svg>
   <div className="world-marker-layer">{groups.map(group=>group.members.length===1?(()=>{const c=localizeVenue(group.members[0]);return <a key={c.id} className={`world-pin ${c.currentSeason?'is-current':''} ${selected===c.id?'is-selected':''}`} tabIndex={inFrame(group)?0:-1} style={{left:group.x,top:group.y,visibility:inFrame(group)?undefined:'hidden'}} href={destination(c)} aria-label={`${c.name}${c.currentSeason?t("，2026 赛历"):''}，${c.modelId?t("进入赛道"):t("查看档案")}`} data-circuit={c.modelId??c.id} data-venue={c.id} onMouseEnter={()=>locate(c.id)} onMouseLeave={()=>setLocating(false)} onFocus={()=>locate(c.id)} onBlur={()=>setLocating(false)} onClick={e=>depart(c,e)}><span aria-hidden="true">•</span></a>})():<button key={group.members.map(c=>c.id).join(',')} className={`world-cluster ${group.members.some(c=>c.currentSeason)?'has-current':''}`} data-count={group.members.length} data-members={group.members.map(c=>c.id).join(' ')} tabIndex={inFrame(group)?0:-1} style={{left:group.x,top:group.y,visibility:inFrame(group)?undefined:'hidden'}} aria-label={tr`${group.members.length}个赛道地点，${view.zoom>=MAX_ZOOM?t("选择地点"):t("放大查看")}`} onClick={()=>{if(view.zoom>=MAX_ZOOM)setNearby(group.members);else{setNearby([]);const v=current.current,z=Math.min(MAX_ZOOM,v.zoom*2),ratio=z/v.zoom;commit({zoom:z,x:(v.x+center.x-group.x)*ratio,y:(v.y+center.y-group.y)*ratio})}}}>{group.members.length}<i>+</i></button>)}</div>
   </div>
   <div className="world-locator" data-visible={String((locating||departing)&&inFrame(target))} aria-hidden="true" data-venue={active.id}>
    <svg width="100%" height="100%"><line className="locator-horizontal" x1="0" x2={size.width} y1="0" y2="0" style={{transform:`translateY(${target.y}px)`}}/><line className="locator-vertical" x1="0" x2="0" y1="0" y2={size.height} style={{transform:`translateX(${target.x}px)`}}/><g className="locator-cross" style={{transform:`translate(${target.x}px,${target.y}px)`}}><rect x="-11" y="-11" width="22" height="22"/><circle r="17"/></g></svg>
    <div className="world-coordinate" style={{transform:`translate(${Math.max(10,Math.min(size.width-168,target.x+180<size.width?target.x+22:target.x-180))}px,${Math.max(42,Math.min(size.height-165,target.y-48))}px)`}}><div key={active.id}><strong>{active.locality}</strong><span>LAT {formatCoordinate(active.coordinate[1],'N','S')}</span><span>LON {formatCoordinate(active.coordinate[0],'E','W')}</span></div></div>
   </div>
  </div>
  <div className="world-map-caption"><span>{entries.length} {t("个地点 / 1950 — 2026")}</span><span className="world-legend"><i/>{t("2026 赛历")}</span></div>
  {nearby.length>0&&<div ref={nearbyPanel} className="world-nearby" role="region" aria-label={t("相邻赛道地点")}><div><strong>{t("选择地点")}</strong><button aria-label={t("关闭相邻地点")} onClick={()=>setNearby([])}>×</button></div>{nearby.map(c=><a key={c.id} href={destination(c)} onMouseEnter={()=>locate(c.id)} onMouseLeave={()=>setLocating(false)} onFocus={()=>locate(c.id)} onBlur={()=>setLocating(false)} onClick={e=>depart(c,e)}>{localizeVenue(c).name}<small>{venueYearsLabel(c)}{c.currentSeason?t(" · 2026 赛历"):''}</small></a>)}</div>}
  <div className="world-map-tools" aria-label={t("世界地图缩放")}><button aria-label={t("放大世界地图")} disabled={view.zoom>=MAX_ZOOM} onClick={()=>zoomAt(1.5)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg></button><button aria-label={t("缩小世界地图")} disabled={view.zoom<=1} onClick={()=>zoomAt(1/1.5)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button><button aria-label={t("恢复世界地图")} onClick={()=>commit({zoom:1,x:0,y:0})}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a8 8 0 1 1 0 8M4 8V3M4 8h5"/></svg></button></div>
  </div>
  <a className="world-destination" onMouseEnter={()=>setLocating(true)} onMouseLeave={()=>setLocating(false)} onFocus={()=>setLocating(true)} onBlur={()=>setLocating(false)} onClick={e=>depart(active,e)} href={destination(active)} aria-label={tr`${active.modelId?t("进入"):t("查看")}${active.locality}赛道`}>{active.modelId&&<CircuitOutline circuitId={active.modelId}/>}<div><small>{venueYearsLabel(active)} · {active.country}</small><strong>{active.locality}</strong><span>{active.name}</span></div><b>↗</b></a>
 </section>;
}
