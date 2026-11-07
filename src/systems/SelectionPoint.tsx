import {zoneName} from '../i18n/data';
import {t,tr} from '../i18n';
import {Html} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {Plane,Raycaster,Vector2,Vector3} from 'three';
import {useCircuit,useCircuitStore} from '../app/CircuitContext';
// The only selection handle lives at the actual world-space observation point.
export function SelectionPoint(){
  const useApp=useCircuitStore(),runtime=useCircuit(),{observer}=runtime;
  const s=useApp(),{camera,gl,scene}=useThree(),id=s.selection.zoneId??'a';
  const region=runtime.data.scene?.regions?.find(r=>r.zoneId===id&&r.tier===s.selection.tier);
  const name=region?t(region.selectionLabel):tr`${zoneName(runtime.spectators.zoneById(id)?.name??'')}选点`;
  const drag=(x:number,y:number)=>{
    const r=gl.domElement.getBoundingClientRect(),ray=new Raycaster();
    ray.setFromCamera(new Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),camera);
    const hit=ray.intersectObjects(scene.children,true).find(h=>h.object.userData.spectatorSurface?.zone.zoneId===id&&(!runtime.selectedSurface(s.selection)||h.object.userData.spectatorSurface===runtime.selectedSurface(s.selection)));
    if(!hit){
      // Small/oblique stands are easy to drag past. Clamp to an actual surface
      // instead of silently leaving the handle stuck when the ray misses it.
      const model=runtime.spectators;
      const projected=ray.ray.intersectPlane(new Plane(new Vector3(0,1,0),-runtime.observerFloor(s.selection).y),new Vector3());
      if(!projected)return;
      let best=s.selection,distance=Infinity;
      for(const surface of model.zoneSurfaces.get(id)??[]){
        if(runtime.selectedSurface(s.selection)&&surface!==runtime.selectedSurface(s.selection))continue;
        const candidate=runtime.selectAt(surface,projected),p=runtime.observer(candidate);
        const d=Math.hypot(projected.x-p.x,projected.z-p.z);
        if(d<distance){distance=d;best=candidate}
      }
      s.select(best);return;
    }
    s.select(runtime.selectAt(hit.object.userData.spectatorSurface,hit.point));
  };
  return <Html portal={{current:document.getElementById('scene-labels')!}} position={observer(s.selection)} center><div className="world-pick-point" role="slider" tabIndex={0} aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.selection.u*100)} data-u={s.selection.u} data-v={s.selection.v}
    onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId)}}
    onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){e.stopPropagation();drag(e.clientX,e.clientY)}}}
    onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}
    onKeyDown={e=>{if(e.key.startsWith('Arrow')){e.preventDefault();s.select({...s.selection,u:s.selection.u+(e.key==='ArrowRight'?.02:e.key==='ArrowLeft'?-.02:0),v:s.selection.v+(e.key==='ArrowUp'?.05:e.key==='ArrowDown'?-.05:0)})}}}
  ><i/><span>{t("拖动选点")}</span></div></Html>;
}
