import {useFrame} from '@react-three/fiber';
import {useApp} from '../store';

export function ShanghaiLabelLayout(){
  useFrame(()=>{
    const labels=Array.from(document.querySelectorAll<HTMLElement>('#scene-labels .marker'));
    if(useApp.getState().mode!=='overview'){labels.forEach(l=>l.style.visibility='');return}
    const blocked=Array.from(document.querySelectorAll('.experience-header,.map-heading,.zone-preview,.map-tools,.terrain-toggle')).map(n=>n.getBoundingClientRect());
    const occupied:DOMRect[]=[];
    // Retain the current area's entry at crowded mobile zoom levels.
    const selected=useApp.getState().selection.zoneId??'a';
    const priority=(label:HTMLElement)=>Number(label.matches('button'))+2*Number(label.dataset.zone===selected);
    labels.sort((a,b)=>priority(b)-priority(a));
    for(const label of labels){
      const r=label.getBoundingClientRect();
      const overlap=(b:DOMRect)=>r.right+8>b.left&&r.left-8<b.right&&r.bottom+6>b.top&&r.top-6<b.bottom;
      const hide=r.left<12||r.right>innerWidth-12||r.top<65||r.bottom>innerHeight-24||blocked.some(overlap)||occupied.some(overlap);
      label.style.visibility=hide?'hidden':'visible';if(!hide)occupied.push(r);
    }
  });return null;
}
