import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {useCircuit} from '../app/CircuitContext';
export function ScenePerformance(){
 const {gl,setDpr}=useThree(),{simulation,shutter}=useCircuit();
 const frames=useRef({start:performance.now(),count:0,total:0,reduced:false});
 useEffect(()=>{const lost=(e:Event)=>{e.preventDefault();simulation.pause()};gl.domElement.addEventListener('webglcontextlost',lost);return()=>gl.domElement.removeEventListener('webglcontextlost',lost)},[gl,simulation]);
 useFrame(()=>{
  const f=frames.current;if(document.hidden||shutter.busy||gl.domElement.dataset.gpuReady==='false'){f.start=performance.now();f.count=0;return}
  gl.domElement.dataset.renderFrames=String(++f.total);
  if(++f.count===120){const fps=120000/(performance.now()-f.start);gl.domElement.dataset.renderFps=fps.toFixed(1);if(fps<35&&!f.reduced){setDpr(.8);f.reduced=true}f.count=0;f.start=performance.now()}
 });return null;
}
