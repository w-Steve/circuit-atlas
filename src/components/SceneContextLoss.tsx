import {useEffect} from 'react';
import {useThree} from '@react-three/fiber';
import {useCircuit} from '../app/CircuitContext';

/** Own the listener with the mounted Canvas, not a route host that can outlive it. */
export function SceneContextLoss({onLost}:{onLost:(lost:boolean)=>void}){
 const {gl}=useThree(),{simulation}=useCircuit();
 useEffect(()=>{
  onLost(false);
  const lost=(event:Event)=>{
   if(!gl.domElement.isConnected)return;
   event.preventDefault();simulation.pause();onLost(true);
  };
  gl.domElement.addEventListener('webglcontextlost',lost);
  return()=>gl.domElement.removeEventListener('webglcontextlost',lost);
 },[gl,simulation,onLost]);
 return null;
}
