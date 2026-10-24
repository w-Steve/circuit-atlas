import {t} from '../i18n';
import { PerspectiveCamera, type Object3D, type Scene, Vector4, type WebGLRenderer } from "three";
import { exposureQuaternion, linearByte, sampleCount, sampleDistance, sampleTimes, srgbToLinear, withVehicleSample, type ExposureMoment } from "./Exposure";
import { focalToFov } from "../systems/PhoneCamera";

export interface PhotoResult { url:string; metadata?:{shutter:number;pan:string;samples:number;distance:number;simulationSeconds:number;velocity:number;focal:number;elapsedMs:number;zoneId?:string} }
export async function temporalCapture(gl:WebGLRenderer,scene:Scene,liveCamera:PerspectiveCamera,vehicle:Object3D,moment:ExposureMoment,focal:number,alive:()=>boolean):Promise<PhotoResult>{
  const started=performance.now(),width=1600,height=1200;
  const photo=document.createElement('canvas');photo.width=width;photo.height=height;
  const ctx=photo.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error(t('无法创建照片'));
  const camera=liveCamera.clone();camera.position.copy(moment.position);camera.quaternion.copy(moment.quaternion);camera.fov=focalToFov(focal);camera.aspect=4/3;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  const coarse=matchMedia('(pointer:coarse)').matches;
  const maximum=navigator.hardwareConcurrency<=4?16:coarse?24:48;
  const count=sampleCount(moment,camera,height,maximum),sum=new Float32Array(width*height*4);
  for(const time of sampleTimes(moment.seconds,count)){
    if(!alive())throw Error(t('拍摄已取消'));
    if(gl.getContext().isContextLost())throw Error(t('WebGL 已中断，请恢复场景后重拍'));
    const target=gl.getRenderTarget(),viewport=gl.getViewport(new Vector4()),scissor=gl.getScissor(new Vector4()),scissorTest=gl.getScissorTest();
    try {
      camera.quaternion.copy(exposureQuaternion(moment,time));camera.updateMatrixWorld(true);
      withVehicleSample(vehicle,sampleDistance(moment,time),()=>{
        // Keep the same renderer's filmic transform and sRGB display pipeline as
        // the viewfinder. Three's ordinary render targets bypass that transform.
        gl.setRenderTarget(null);gl.setScissorTest(false);
        gl.render(scene,camera);
        ctx.drawImage(gl.domElement,0,0,width,height);
        const pixels=ctx.getImageData(0,0,width,height).data;
        for(let i=0;i<pixels.length;i+=4){sum[i]+=srgbToLinear[pixels[i]];sum[i+1]+=srgbToLinear[pixels[i+1]];sum[i+2]+=srgbToLinear[pixels[i+2]]}
      });
    } finally {
      gl.setRenderTarget(target);gl.setViewport(viewport);gl.setScissor(scissor);gl.setScissorTest(scissorTest);
      // The browser only presents this restored live frame, never a sample.
      if(!gl.getContext().isContextLost())gl.render(scene,liveCamera);
    }
    // Yield with every transform restored. Live physics advances normally; all
    // photograph samples still use the immutable moment recorded at the shutter.
    if(count>1)await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  const result=ctx.createImageData(width,height),pixels=result.data;
  for(let i=0;i<pixels.length;i+=4){pixels[i]=linearByte(sum[i]/count);pixels[i+1]=linearByte(sum[i+1]/count);pixels[i+2]=linearByte(sum[i+2]/count);pixels[i+3]=255}
  ctx.putImageData(result,0,0);
  return {url:photo.toDataURL('image/png'),metadata:{shutter:Math.round(1/moment.seconds),pan:moment.pan,samples:count,distance:moment.distance,simulationSeconds:moment.simulationSeconds,velocity:moment.velocity,focal,elapsedMs:performance.now()-started}};
}
