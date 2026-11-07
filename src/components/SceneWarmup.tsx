import {useLayoutEffect} from 'react';
import {useThree} from '@react-three/fiber';
import {warmSceneShaders} from '../camera/ShaderWarmup';

/** Compile the fully attached scene before its first rendered frame. Waiting
 * for KHR_parallel_shader_compile avoids synchronously blocking the cloud
 * animation on shader status queries. Normal rendering resumes unchanged. */
export function SceneWarmup(){
 const {gl,scene,camera,invalidate}=useThree();
 useLayoutEffect(()=>{
  let cancelled=false;
  let cancelCompile:(()=>void)|undefined;
  gl.domElement.dataset.cameraReady='false';gl.domElement.dataset.gpuReady='false';
  // Wait until the entire R3F commit (including lights/material attachments) is
  // complete. ExposurePreview owns rendering and skips draws during this wait.
  const frame=requestAnimationFrame(()=>{
   scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
   const ready=()=>{
    if(cancelled)return;gl.domElement.dataset.gpuReady='true';invalidate();
   };
   cancelCompile=warmSceneShaders(gl,scene,camera,ready,ready);
  });
  const lost=()=>{cancelled=true;cancelAnimationFrame(frame);cancelCompile?.()};gl.domElement.addEventListener('webglcontextlost',lost);
  return()=>{cancelled=true;cancelAnimationFrame(frame);cancelCompile?.();gl.domElement.removeEventListener('webglcontextlost',lost)};
 },[gl,scene,camera,invalidate]);
 return null;
}
