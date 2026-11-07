import {useEffect} from 'react';
import {useCircuit,useCircuitStore} from '../app/CircuitContext';

export function useDismissPanel(open:boolean,close:()=>void,selector:string){
  useEffect(()=>{
    if(!open)return;
    const pointer=(e:PointerEvent)=>{if(!(e.target instanceof Element)||!e.target.closest(selector))close()};
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close()};
    document.addEventListener('pointerdown',pointer,true);document.addEventListener('keydown',key);
    return ()=>{document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('keydown',key)};
  },[open,close,selector]);
}
export function TransientPanels(){
  const useApp=useCircuitStore();
  const mode=useApp(s=>s.mode);
  useEffect(()=>{
    const prevent=(e:Event)=>{if(e.target instanceof Element&&e.target.closest('.world,#scene-labels,.phone-controls,.experience-header'))e.preventDefault()};
    document.addEventListener('contextmenu',prevent);document.addEventListener('dragstart',prevent);
    return()=>{document.removeEventListener('contextmenu',prevent);document.removeEventListener('dragstart',prevent)};
  },[]);
  useEffect(()=>{
    const all=()=>Array.from(document.querySelectorAll<HTMLDetailsElement>('.speed-menu,.measure-menu,.phone-settings'));
    all().forEach(d=>d.open=false);
    const pointer=(e:PointerEvent)=>all().forEach(d=>{if(!d.contains(e.target as Node))d.open=false});
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')all().forEach(d=>{if(d.open){d.open=false;d.querySelector('summary')?.focus()}})};
    const toggle=(e:Event)=>{const current=e.target;if(current instanceof HTMLDetailsElement&&current.open&&all().includes(current))all().forEach(d=>{if(d!==current)d.open=false})};
    document.addEventListener('pointerdown',pointer,true);document.addEventListener('keydown',key);document.addEventListener('toggle',toggle,true);
    return ()=>{document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('keydown',key);document.removeEventListener('toggle',toggle,true)};
  },[mode]);return null;
}
