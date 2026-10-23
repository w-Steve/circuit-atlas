import {memo,useEffect,useRef,useState} from 'react';
import land from '../assets/world-land.json';
import {atlasVenues,venuePath,venueYearsLabel} from '../atlas';
import {circuitPath} from '../app/navigation';
import {CircuitOutline} from './CircuitOutline';
import './WorldCircuitMap.css';
export const projectWorld=([lon,lat]:readonly number[])=>({x:(lon+180)*1200/360,y:(82-lat)*1200/360});
const MAX_ZOOM=24;
type View={zoom:number;x:number;y:number};
type Point={x:number;y:number};
const Land=memo(()=> <>{land.map((d,i)=><path key={i} d={d} fillRule="evenodd"/>)}</>);
const entries=atlasVenues.map(c=>({...c,...projectWorld(c.coordinate)}));
const destination=(c:typeof entries[number])=>c.modelId?circuitPath(c.modelId):venuePath(c);
export function WorldCircuitMap(){
 const host=useRef<HTMLDivElement>(null),[size,setSize]=useState({width:1200,height:500});
 const [view,setView]=useState<View>({zoom:1,x:0,y:0}),current=useRef(view),[selected,setSelected]=useState('shanghai');
 const [nearby,setNearby]=useState<typeof entries>([]),nearbyPanel=useRef<HTMLDivElement>(null);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(!nearbyPanel.current?.contains(e.target as Node)&&!(e.target as Element).closest('.world-cluster'))setNearby([])};const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setNearby([])};document.addEventListener('pointerdown',close,true);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',close,true);document.removeEventListener('keydown',key)}},[]);
 const pointers=useRef(new Map<number,Point>()),gesture=useRef<{center:Point;distance:number}|null>(null);
 const base=Math.min(size.width/1200,size.height/500),scale=base*view.zoom,center={x:size.width/2,y:size.height*(size.width<650?.38:.5)};
 const actions=useRef(new Map<number,HTMLElement>()),moved=useRef(false),origins=useRef(new Map<number,Point>());
 const commit=(next:View)=>{
  const zoom=Math.min(MAX_ZOOM,Math.max(1,next.zoom));
  const bx=Math.max(0,(1200*base*zoom-size.width)/2)+size.width*.3,by=Math.max(0,(500*base*zoom-size.height)/2)+size.height*.25;
  const v={zoom,x:Math.max(-bx,Math.min(bx,next.x)),y:Math.max(-by,Math.min(by,next.y))};current.current=v;setView(v);
 };
 const zoomAt=(factor:number,p:Point=center)=>{
  const v=current.current,z=Math.max(1,Math.min(MAX_ZOOM,v.zoom*factor)),r=z/v.zoom;
  commit({zoom:z,x:p.x-center.x-(p.x-center.x-v.x)*r,y:p.y-center.y-(p.y-center.y-v.y)*r});
 };
 useEffect(()=>{const r=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));r.observe(host.current!);return()=>r.disconnect()},[]);
 useEffect(()=>{
  const element=host.current!;
  const wheel=(e:WheelEvent)=>{if(!e.ctrlKey&&document.activeElement!==element)return;e.preventDefault();const r=element.getBoundingClientRect();zoomAt(Math.exp(-e.deltaY*.002),{x:e.clientX-r.left,y:e.clientY-r.top})};
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
 const active=entries.find(c=>c.id===selected)!;
 return <section className="world-explorer" aria-label="全球赛道地图">
  <div className="world-map" ref={host} tabIndex={0} aria-label="世界赛道地图，可拖动和缩放" data-zoom={view.zoom.toFixed(3)} data-pan={`${view.x.toFixed(1)},${view.y.toFixed(1)}`}
   onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(['+','=','-','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();if(e.key==='+'||e.key==='=')zoomAt(1.4);if(e.key==='-')zoomAt(1/1.4);if(e.key==='Home')commit({zoom:1,x:0,y:0});const dx=e.key==='ArrowLeft'?60:e.key==='ArrowRight'?-60:0,dy=e.key==='ArrowUp'?60:e.key==='ArrowDown'?-60:0;if(dx||dy)commit({...current.current,x:current.current.x+dx,y:current.current.y+dy})}}
   onPointerDown={e=>{const action=(e.target as Element).closest<HTMLElement>('a,button');if(e.button>0||action&&e.pointerType!=='touch')return;if(!pointers.current.size)moved.current=false;else moved.current=true;e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top};pointers.current.set(e.pointerId,p);origins.current.set(e.pointerId,p);if(action)actions.current.set(e.pointerId,action);gesture.current=snapshot()}}
   onPointerMove={e=>{if(!pointers.current.has(e.pointerId))return;const r=e.currentTarget.getBoundingClientRect(),old=gesture.current!,p={x:e.clientX-r.left,y:e.clientY-r.top},origin=origins.current.get(e.pointerId)!;if(Math.hypot(p.x-origin.x,p.y-origin.y)>4)moved.current=true;pointers.current.set(e.pointerId,p);const next=snapshot()!,v=current.current;const z=Math.max(1,Math.min(MAX_ZOOM,v.zoom*(old.distance&&next.distance?next.distance/old.distance:1))),ratio=z/v.zoom;if(moved.current)commit({zoom:z,x:next.center.x-center.x-(old.center.x-center.x-v.x)*ratio,y:next.center.y-center.y-(old.center.y-center.y-v.y)*ratio});gesture.current=next}}
   onPointerUp={e=>finish(e.pointerId,true)} onPointerCancel={e=>finish(e.pointerId)} onLostPointerCapture={e=>finish(e.pointerId)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){pointers.current.clear();actions.current.clear();origins.current.clear();gesture.current=null}}}>
   <svg width="100%" height="100%" aria-hidden="true" className="world-geography"><g transform={`translate(${center.x+view.x} ${center.y+view.y}) scale(${scale}) translate(-600 -250)`}>
    <g className="world-graticule">{[-150,-120,-90,-60,-30,0,30,60,90,120,150].map(l=><path key={l} d={`M${(l+180)*1200/360} 0V475`}/>)}{[-30,0,30,60].map(l=><path key={l} d={`M0 ${(82-l)*1200/360}H1200`}/>)}</g>
    <g className="world-land"><Land/></g>
   </g></svg>
   <div className="world-marker-layer">{groups.map(group=>group.members.length===1?(()=>{const c=group.members[0];return <a key={c.id} className={`world-pin ${c.currentSeason?'is-current':''} ${selected===c.id?'is-selected':''}`} tabIndex={inFrame(group)?0:-1} style={{left:group.x,top:group.y,visibility:inFrame(group)?undefined:'hidden'}} href={destination(c)} aria-label={`${c.name}${c.currentSeason?'，2026 赛历':''}，${c.modelId?'进入赛道':'查看档案'}`} data-circuit={c.modelId??c.id} data-venue={c.id} onMouseEnter={()=>setSelected(c.id)} onFocus={()=>setSelected(c.id)}><span aria-hidden="true">•</span></a>})():<button key={group.members.map(c=>c.id).join(',')} className={`world-cluster ${group.members.some(c=>c.currentSeason)?'has-current':''}`} data-count={group.members.length} data-members={group.members.map(c=>c.id).join(' ')} tabIndex={inFrame(group)?0:-1} style={{left:group.x,top:group.y,visibility:inFrame(group)?undefined:'hidden'}} aria-label={`${group.members.length}个赛道地点，${view.zoom>=MAX_ZOOM?'选择地点':'放大查看'}`} onClick={()=>{if(view.zoom>=MAX_ZOOM)setNearby(group.members);else{setNearby([]);const v=current.current,z=Math.min(MAX_ZOOM,v.zoom*2),ratio=z/v.zoom;commit({zoom:z,x:(v.x+center.x-group.x)*ratio,y:(v.y+center.y-group.y)*ratio})}}}>{group.members.length}<i>+</i></button>)}</div>
  </div>
  <div className="world-map-caption"><span>{entries.length} 个地点 / 1950 — 2026</span><span className="world-legend"><i/>2026 赛历</span></div>
  <a className="world-destination" href={destination(active)} aria-label={`${active.modelId?'进入':'查看'}${active.locality}赛道`}>{active.modelId&&<CircuitOutline circuitId={active.modelId}/>}<div><small>{venueYearsLabel(active)} · {active.country}</small><strong>{active.locality}</strong><span>{active.name}</span></div><b>↗</b></a>
  {nearby.length>0&&<div ref={nearbyPanel} className="world-nearby" role="region" aria-label="相邻赛道地点"><div><strong>选择地点</strong><button aria-label="关闭相邻地点" onClick={()=>setNearby([])}>×</button></div>{nearby.map(c=><a key={c.id} href={destination(c)}>{c.name}<small>{venueYearsLabel(c)}{c.currentSeason?' · 2026 赛历':''}</small></a>)}</div>}
  <div className="world-map-tools" aria-label="世界地图缩放"><button aria-label="放大世界地图" disabled={view.zoom>=MAX_ZOOM} onClick={()=>zoomAt(1.5)}>+</button><button aria-label="缩小世界地图" disabled={view.zoom<=1} onClick={()=>zoomAt(1/1.5)}>−</button><button aria-label="恢复世界地图" onClick={()=>commit({zoom:1,x:0,y:0})}>↺</button></div>
  <div className="world-map-foot"><span className="world-mouse-hint">拖动平移 · Ctrl + 滚轮缩放</span><span className="world-touch-hint">拖动平移 · 双指缩放</span><span>Made with Natural Earth</span></div>
 </section>;
}
