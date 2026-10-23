import {useEffect, useRef} from 'react';
import type {RefObject} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {Vector3} from 'three';
import type {OrbitControls} from 'three-stdlib';

/** Pan in the screen's horizontal plane. Never moves a seated observer. */
export function MapKeyboard({controls, enabled=true}:{controls:RefObject<OrbitControls|null>;enabled?:boolean}) {
  const held=useRef(new Set<string>()), {invalidate,gl}=useThree();
  useEffect(()=>{
    if(!enabled)return;
    const clear=()=>held.current.clear();
    const down=(e:KeyboardEvent)=>{
      if(e.ctrlKey||e.altKey||e.metaKey||!(e.code==='KeyW'||e.code==='KeyA'||e.code==='KeyS'||e.code==='KeyD'))return;
      if(!gl.domElement.getClientRects().length||document.querySelector('[role="dialog"][aria-modal="true"]'))return;
      if(e.target instanceof Element&&e.target.closest('input,textarea,select,[contenteditable="true"],[role="slider"]'))return;
      e.preventDefault();held.current.add(e.code);invalidate();
    };
    const up=(e:KeyboardEvent)=>held.current.delete(e.code);
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
    return()=>{clear();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear)};
  },[enabled,invalidate,gl]);
  useFrame((_,dt)=>{
    const c=controls.current;if(!enabled||!c?.enabled||!held.current.size)return;
    const x=Number(held.current.has('KeyD'))-Number(held.current.has('KeyA'));
    const z=Number(held.current.has('KeyW'))-Number(held.current.has('KeyS'));
    if(!x&&!z)return;
    const right=new Vector3().setFromMatrixColumn(c.object.matrix,0);right.y=0;right.normalize();
    const forward=new Vector3().crossVectors(new Vector3(0,1,0),right).normalize();
    const movement=right.multiplyScalar(x).addScaledVector(forward,z).normalize()
      .multiplyScalar(c.object.position.distanceTo(c.target)*.55*Math.min(dt,.05));
    c.object.position.add(movement);c.target.add(movement);c.update();c.object.updateMatrixWorld(true);
    gl.domElement.dataset.keyboardPan=JSON.stringify(c.target.toArray());invalidate();
  },-.5);
  return null;
}
