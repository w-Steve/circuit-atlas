import {t} from "../i18n";
import {useEffect,useRef} from 'react';
import {Vector3} from 'three';
import {activeMapControls} from '../systems/ObserverCamera';
/** Geographic north and a scale at the orbit target; camera changes keep zoom. */
export function MapOrientation(){
 const needle=useRef<HTMLElement>(null),scale=useRef<HTMLDivElement>(null),label=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  let frame=0,last=0;const north=new Vector3(0,0,-1);
  const update=(time:number)=>{
   const controls=activeMapControls.current;
   if(controls&&time-last>80){
    last=time;const c=controls.object;const direction=north.clone().applyQuaternion(c.quaternion.clone().invert());
    if(needle.current)needle.current.style.transform=`rotate(${Math.atan2(direction.x,direction.y)}rad)`;
    const camera=c as import('three').PerspectiveCamera;
    const mpp=2*c.position.distanceTo(controls.target)*Math.tan(camera.fov*Math.PI/360)/(controls.domElement?.clientHeight??innerHeight);
    const desired=mpp*70,unit=10**Math.floor(Math.log10(desired)),value=([10,5,2,1].find(n=>n*unit<=desired)??1)*unit;
    if(scale.current)scale.current.style.width=`${value/mpp}px`;
    if(label.current)label.current.textContent=value>=1000?`${Number((value/1000).toFixed(1))} km`:`${value} m`;
   }
   frame=requestAnimationFrame(update);
  };frame=requestAnimationFrame(update);return()=>cancelAnimationFrame(frame);
 },[]);
 return <div className="map-orientation"><button aria-label={t("地图朝北，保留缩放")} title={t("朝北")} onClick={()=>{
   const c=activeMapControls.current;if(!c)return;const delta=c.object.position.clone().sub(c.target),distance=delta.length(),polar=c.getPolarAngle();
   const damping=c.enableDamping;c.enableDamping=false;c.update();
   c.object.position.copy(c.target).add(new Vector3(0,distance*Math.cos(polar),distance*Math.sin(polar)));c.update();
   c.enableDamping=damping;
  }}><span>N</span><i ref={needle}>↑</i></button><div className="map-scale" ref={scale}><span ref={label}/></div></div>;
}
