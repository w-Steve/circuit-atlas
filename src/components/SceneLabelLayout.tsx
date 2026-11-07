import {useFrame,useThree} from '@react-three/fiber';
import {useCircuit,useCircuitStore} from '../app/CircuitContext';


export function SceneLabelLayout(){
  const useApp=useCircuitStore();
 const {controls:activeMapControls}=useCircuit();
  const {camera,size}=useThree();
  useFrame(()=>{
    const labels=Array.from(document.querySelectorAll<HTMLElement>('#scene-labels .marker'));
    if(useApp.getState().mode!=='overview'){labels.forEach(l=>l.style.visibility='');return}
    const controls=activeMapControls.current;
    const mpp=controls?2*camera.position.distanceTo(controls.target)*Math.tan((camera as import('three').PerspectiveCamera).fov*Math.PI/360)/size.height:0;
    // Normal overview still needs readable destinations. Only a genuinely
    // distant view collapses them; timing annotations never decide this state.
    const compact=String(mpp>8);
    labels.filter(l=>l.matches('button')).forEach(l=>{if(l.dataset.compact!==compact)l.dataset.compact=compact;l.title=l.textContent??''});
    const blocked=Array.from(document.querySelectorAll('.experience-header,.map-heading,.zone-preview,.map-tools,.terrain-toggle,.map-orientation')).map(n=>n.getBoundingClientRect());
    const occupied:DOMRect[]=[];
    // Retain the current area's entry at crowded mobile zoom levels.
    const selected=useApp.getState().selection.zoneId??'a';
    const priority=(label:HTMLElement)=>Number(label.matches('button'))+2*Number(label.dataset.zone===selected)+4*Number(label.matches(':hover,:focus-visible'));
    labels.sort((a,b)=>priority(b)-priority(a));
    for(const label of labels){
      const r=label.getBoundingClientRect();
      const overlap=(b:DOMRect)=>r.right+8>b.left&&r.left-8<b.right&&r.bottom+6>b.top&&r.top-6<b.bottom;
      const hide=r.left<12||r.right>innerWidth-12||r.top<65||r.bottom>innerHeight-24||blocked.some(overlap)||occupied.some(overlap);
      label.style.visibility=hide?'hidden':'visible';if(!hide)occupied.push(r);
    }
  });return null;
}
