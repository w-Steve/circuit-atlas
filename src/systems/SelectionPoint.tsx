import {circuitRuntime} from "../circuits/runtime";
import {Html} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {Plane,Raycaster,Vector2,Vector3} from 'three';
import {useApp} from '../store';
import {observer,tierData} from './GrandstandGeometry';
import {selectionAt} from '../circuits/shanghai/spectators';
import * as shanghaiSpectators from '../circuits/shanghai/spectators';
import {local,along,facilities} from '../data/config';

// The only selection handle lives at the actual world-space observation point.
export function SelectionPoint(){
  const s=useApp(),{camera,gl,scene}=useThree(),id=s.selection.zoneId??'a';
  const runtime=circuitRuntime.current;
  const name=runtime?`${runtime.spectators.zoneById(id)?.name}选点`:id==='a'?(s.selection.tier==='upper'?'上层看台选点':s.selection.tier==='platinum'?'铂金区域选点':'下层看台选点'):`${id.toUpperCase()} ${['c','f','j'].includes(id)?'草地':'看台'}选点`;
  const drag=(x:number,y:number)=>{
    const r=gl.domElement.getBoundingClientRect(),ray=new Raycaster();
    ray.setFromCamera(new Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),camera);
    const hit=ray.intersectObjects(scene.children,true).find(h=>!runtime&&id==='a'?h.object.userData.selectionTier=== (s.selection.tier==='platinum'?'upper':s.selection.tier):h.object.userData.spectatorSurface?.zone.zoneId===id);
    if(!hit){
      // Small/oblique stands are easy to drag past. Clamp to an actual surface
      // instead of silently leaving the handle stuck when the ray misses it.
      if(!runtime&&id==='a')return;
      const model=runtime?.spectators??shanghaiSpectators;
      const projected=ray.ray.intersectPlane(new Plane(new Vector3(0,1,0),-(observer(s.selection).y-1.2)),new Vector3());
      if(!projected)return;
      let best=s.selection,distance=Infinity;
      for(const surface of model.zoneSurfaces.get(id)??[]){
        const candidate=model.selectionAt(surface,projected),p=model.zonePoint(id,candidate.u,candidate.v,false);
        const d=Math.hypot(projected.x-p.x,projected.z-p.z);
        if(d<distance){distance=d;best=candidate}
      }
      s.select(best);return;
    }
    if(runtime){s.select(runtime.spectators.selectionAt(hit.object.userData.spectatorSurface,hit.point));return}
    if(id!=='a'){s.select(selectionAt(hit.object.userData.spectatorSurface,hit.point));return}
    const center=local(0,0,0),dx=hit.point.x-center[0],dz=hit.point.z-center[2],t=tierData(s.selection.tier);
    let u=(dx*along.x+dz*along.z)/facilities.stand.length+.5,v=(dx*along.z-dz*along.x-t.offset)/t.depth;
    if(s.selection.tier==='platinum'){u=(u-.35)/.3;v=(v-.32)/.36}
    s.select({...s.selection,u,v});
  };
  return <Html portal={{current:document.getElementById('scene-labels')!}} position={observer(s.selection)} center><div className="world-pick-point" role="slider" tabIndex={0} aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.selection.u*100)} data-u={s.selection.u} data-v={s.selection.v}
    onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId)}}
    onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){e.stopPropagation();drag(e.clientX,e.clientY)}}}
    onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}
    onKeyDown={e=>{if(e.key.startsWith('Arrow')){e.preventDefault();s.select({...s.selection,u:s.selection.u+(e.key==='ArrowRight'?.02:e.key==='ArrowLeft'?-.02:0),v:s.selection.v+(e.key==='ArrowUp'?.05:e.key==='ArrowDown'?-.05:0)})}}}
  ><i/><span>拖动选点</span></div></Html>;
}
