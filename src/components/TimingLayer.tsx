import {useEffect,useMemo} from 'react';
import {Html,Line} from '@react-three/drei';
import {addAfterEffect,useThree} from '@react-three/fiber';
import {BufferGeometry,Float32BufferAttribute,Color,Vector3} from 'three';
import type {CircuitPackage,CircuitTiming} from '../circuits/types';
import type {createCircuitGeometry} from '../circuits/geometry';
import {resolveTiming} from '../circuits/timingGeometry';
import {useApp} from '../store';
import {t} from '../i18n';
import './TimingLayer.css';
export const sectorColors=['#d9ac61','#65ada9','#d47772'];
export function TimingLegend(){
 const show=useApp(s=>s.timingVisible),toggle=useApp(s=>s.setTimingVisible);
 return <button className="timing-toggle" aria-label={t('显示计时分段')} aria-pressed={show} onClick={()=>toggle(!show)}>{sectorColors.map((color,i)=><span key={color}><i style={{background:color}}/>S{i+1}</span>)}</button>;
}
export function TimingReference({source}:{source?:CircuitTiming}){
 return source?<><p>{t('计时位置由FIA场地图配准估算，并非测绘。')}</p>{source.sourceSeason!==2026&&<p>{t('计时点参考2025年资料，2026位置尚待赛事文件确认。')}</p>}<a href={source.source.url} target="_blank" rel="noreferrer">{t('FIA计时资料 ↗')}</a></>:null;
}
function TimingLabelLayout(){
 useEffect(()=>addAfterEffect(()=>{
  const tags=Array.from(document.querySelectorAll<HTMLElement>('.timing-tag'));
  // Stand entries own their screen space even when another stand currently
  // hides them. Timing annotations must never prevent a stand from reappearing.
  const blockers=Array.from(document.querySelectorAll('.experience-header,.map-heading,.zone-preview,.map-tools,.map-orientation,.explorer-nav,.explorer-title,.explorer-tools,#scene-labels .marker')).map(e=>e.getBoundingClientRect());
  // Read geometry once, then batch style writes. Four per-tag layout loops
  // forced repeated reflow every frame on mobile while orbiting the map.
  const boxes=tags.map(tag=>({tag,r:tag.getBoundingClientRect(),offset:Number(tag.dataset.timingOffset??0)})),writes:{tag:HTMLElement;chosen:number|undefined}[]=[];
  for(const {tag,r,offset:old} of boxes){
   const baseTop=r.top-old;let chosen:number|undefined;
   for(const offset of [0,-24,24,-48,48]){
    const top=baseTop+offset,bottom=top+r.height;
    if(r.left<10||r.right>innerWidth-10||top<64||bottom>innerHeight-24)continue;
    if(!blockers.some(b=>r.left<b.right+4&&r.right>b.left-4&&top<b.bottom+4&&bottom>b.top-4)){chosen=offset;blockers.push(new DOMRect(r.left,top,r.width,r.height));break}
   }
   writes.push({tag,chosen});
  }
  // Translate the child without changing Html's centering box. A top margin
  // changes that box's height and feeds half the offset back into the next pass.
  for(const {tag,chosen} of writes){const visibility=chosen===undefined?'hidden':'visible',offset=chosen??0,transform=`translateY(${offset}px)`;if(tag.style.visibility!==visibility)tag.style.visibility=visibility;if(tag.style.transform!==transform)tag.style.transform=transform;tag.dataset.timingOffset=String(offset)}
 }),[]);
 return null;
}
function TimingTag({point,label,kind}:{point:Vector3;label:string;kind:string}){
 const host=document.getElementById('scene-labels');
 return <Html center portal={host?{current:host}:undefined} position={point}><span className={`timing-tag timing-${kind}`} data-timing-mark={kind}>{label}</span></Html>;
}
export function TimingLayer({data,geometry,source=data.timing,widths,roadSurfaceOffset=.2}:{data:CircuitPackage;geometry:ReturnType<typeof createCircuitGeometry>;source?:CircuitTiming;widths?:readonly number[];roadSurfaceOffset?:number}){
 const mode=useApp(s=>s.mode),show=useApp(s=>s.timingVisible),overview=mode==='overview'&&show;
 const {gl}=useThree();
 const model=useMemo(()=>{
  if(!source)return null;
  try{return resolveTiming(data,geometry,source)}catch{return null}
 },[data,geometry,source]);
 useEffect(()=>{
  gl.domElement.dataset.timingSectorsVisible=String(overview);
  if(model)gl.domElement.dataset.timingMarks=JSON.stringify({start:model.start,control:model.control,splits:model.splits,sourceSeason:model.source.sourceSeason,registrationRmsMetres:model.registrationRmsMetres});
  else delete gl.domElement.dataset.timingMarks;
 },[gl,model,overview]);
 const meshes=useMemo(()=>{
  if(!model)return null;const points:Vector3[]=[],colors:Color[]=[],lineVertices:number[]=[],lineColors:number[]=[];
  const emit=(out:number[],col:number[],a:Vector3,b:Vector3,c:Vector3,color:Color)=>{for(const p of [a,b,c]){out.push(p.x,p.y,p.z);col.push(color.r,color.g,color.b)}};
  const normal=(s:number)=>{const q=geometry.tangent(s);return new Vector3(-q.z,0,q.x).normalize()};
  const count=2400;
  for(let i=0;i<=count;i++){
   const s=i*geometry.length/count;
   points.push(geometry.at(s).add(new Vector3(0,roadSurfaceOffset+.26,0)));colors.push(new Color(sectorColors[model.sectorAt(s)]));
  }
  for(const [kind,s] of [['start',model.start],['control',model.control]] as const){
   const p=geometry.at(s).add(new Vector3(0,roadSurfaceOffset+.015,0)),n=normal(s),v=geometry.tangent(s).setY(0).normalize();
   const w=widths?.[Math.floor(s/geometry.length*widths.length)%widths.length]??data.trackGeometry.widthMetres;
   const cells=kind==='control'?Math.max(4,Math.round(w/.65)):1;
   for(let i=0;i<cells;i++)for(let row=0;row<(kind==='control'?2:1);row++){
    const left=-w/2+w*i/cells,right=left+w/cells,y=kind==='start'?0:(row-.5)*.35,thickness=kind==='start'?.15:.175;
    const a=p.clone().addScaledVector(n,left).addScaledVector(v,y-thickness),b=p.clone().addScaledVector(n,right).addScaledVector(v,y-thickness),c=p.clone().addScaledVector(n,right).addScaledVector(v,y+thickness),d=p.clone().addScaledVector(n,left).addScaledVector(v,y+thickness),color=new Color(kind==='start'||(i+row)%2===0?'#f2eee3':'#24272a');
    emit(lineVertices,lineColors,a,b,c,color);emit(lineVertices,lineColors,a,c,d,color);
   }
  }
  const mesh=(v:number[],c:number[])=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(v,3));g.setAttribute('color',new Float32BufferAttribute(c,3));return g};
  return {points,colors,lines:mesh(lineVertices,lineColors)};
 },[model,geometry,data.trackGeometry.widthMetres,widths,roadSurfaceOffset]);
 useEffect(()=>()=>{meshes?.lines.dispose()},[meshes]);
 if(!model||!meshes)return null;
 const tag=(s:number,side:number)=>{const p=geometry.at(s),n=geometry.tangent(s);return p.add(new Vector3(-n.z*side,14,n.x*side))};
 const separation=Math.min(Math.abs(model.start-model.control),geometry.length-Math.abs(model.start-model.control));
 return <group name="circuit-timing" userData={{sourceSeason:source!.sourceSeason}}>
  <mesh geometry={meshes.lines}><meshBasicMaterial vertexColors side={2} polygonOffset polygonOffsetFactor={-5} polygonOffsetUnits={-5}/></mesh>
  {overview&&<><TimingLabelLayout/><Line points={meshes.points} vertexColors={meshes.colors} lineWidth={1.8} transparent opacity={.95} depthWrite={false} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4}/>
   {separation<20?<TimingTag point={tag(model.control,22)} label={t('发车 / 计时线')} kind="start-control"/>:<><TimingTag point={tag(model.start,-22)} label={t('发车线')} kind="start"/><TimingTag point={tag(model.control,22)} label={t('计时线')} kind="control"/></>}
   <TimingTag point={tag(model.splits[0],20)} label="S1 → S2" kind="split-1"/><TimingTag point={tag(model.splits[1],20)} label="S2 → S3" kind="split-2"/>
  </>}
 </group>;
}
