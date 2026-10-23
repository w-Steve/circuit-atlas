import {useEffect,useMemo} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {AdditiveBlending,Color,FramebufferTexture,HalfFloatType,Mesh,OrthographicCamera,PerspectiveCamera,PlaneGeometry,Scene,ShaderMaterial,Vector2,WebGLRenderTarget} from 'three';
import {useApp} from '../store';
import {simulation} from '../systems/VehicleSimulation';
import {carObject} from '../systems/Vehicle';
import {shutter} from '../systems/PhoneControls';
import {exposureQuaternion,freezeMoment,sampleCount,sampleDistance,sampleTimes,withVehicleSample} from './Exposure';

const vertex=`varying vec2 uvOut;void main(){uvOut=uv;gl_Position=vec4(position.xy,0.,1.);}`;
// Read the exact display pipeline on the GPU, decode sRGB and accumulate in
// linear light, matching photo export without a second tone-mapping pass.
export function ExposurePreview({active}:{active:boolean}){
  const {gl}=useThree();
  const resources=useMemo(()=>{
    const sample=new FramebufferTexture(1,1),sum=new WebGLRenderTarget(1,1,{type:HalfFloatType,depthBuffer:false});
    const accumulate=new ShaderMaterial({vertexShader:vertex,fragmentShader:'uniform sampler2D frame;uniform float weight;varying vec2 uvOut;void main(){vec3 c=texture2D(frame,uvOut).rgb;vec3 linearColor=mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));gl_FragColor=vec4(linearColor*weight,1.);}',uniforms:{frame:{value:sample},weight:{value:1}},blending:AdditiveBlending,depthTest:false,depthWrite:false,toneMapped:false});
    const display=new ShaderMaterial({vertexShader:vertex,fragmentShader:`uniform sampler2D frame;varying vec2 uvOut;void main(){gl_FragColor=vec4(texture2D(frame,uvOut).rgb,1.);
      #include <colorspace_fragment>
    }`,uniforms:{frame:{value:sum.texture}},depthTest:false,depthWrite:false,toneMapped:false});
    const quad=new Mesh(new PlaneGeometry(2,2),accumulate),scene=new Scene();scene.add(quad);
    return {sample,sum,accumulate,display,quad,scene,camera:new OrthographicCamera(-1,1,1,-1,0,1),size:new Vector2()};
  },[]);
  useEffect(()=>()=>{resources.sample.dispose();resources.sum.dispose();resources.accumulate.dispose();resources.display.dispose();resources.quad.geometry.dispose()},[resources]);
  useFrame(({scene,camera})=>{
    if(!active)return;
    const settings=useApp.getState(),vehicle=carObject.current;
    if(settings.mode!=='phone'||!vehicle||shutter.busy||simulation.status!=='running'){
      gl.domElement.dataset.exposurePreviewSamples='1';
      if(simulation.status!=='running')gl.domElement.dataset.exposurePreviewTime='0';
      gl.render(scene,camera);
      gl.domElement.dataset.renderedCamera=JSON.stringify({position:camera.position.toArray(),aspect:(camera as PerspectiveCamera).aspect});
      return;
    }
    const r=resources,live=camera as PerspectiveCamera,exposureCamera=live.clone(),moment=freezeMoment(simulation,live,settings.shutterSpeed,settings.panMode);
    gl.getDrawingBufferSize(r.size);
    if(r.sample.image.width!==r.size.x||r.sample.image.height!==r.size.y){r.sample.dispose();r.sample.image.width=r.size.x;r.sample.image.height=r.size.y;r.sample.needsUpdate=true;r.sum.setSize(r.size.x,r.size.y)}
    const count=sampleCount(moment,live,r.size.y,matchMedia('(pointer:coarse)').matches?4:8);
    const autoClear=gl.autoClear,target=gl.getRenderTarget(),shadowUpdate=gl.shadowMap.autoUpdate,clear=gl.getClearColor(new Color()),alpha=gl.getClearAlpha();
    try{
      gl.setRenderTarget(r.sum);gl.setClearColor(0,0);gl.clear();gl.setClearColor(clear,alpha);r.accumulate.uniforms.weight.value=1/count;
      for(const time of sampleTimes(moment.seconds,count)){
        exposureCamera.quaternion.copy(exposureQuaternion(moment,time));exposureCamera.updateMatrixWorld(true);
        withVehicleSample(vehicle,sampleDistance(moment,time),()=>{gl.autoClear=true;gl.setRenderTarget(null);gl.render(scene,exposureCamera);gl.copyFramebufferToTexture(r.sample)});
        gl.shadowMap.autoUpdate=false;r.quad.material=r.accumulate;gl.autoClear=false;gl.setRenderTarget(r.sum);gl.render(r.scene,r.camera);
      }
      gl.autoClear=true;gl.setRenderTarget(target);r.quad.material=r.display;gl.render(r.scene,r.camera);
      gl.domElement.dataset.exposurePreviewSamples=String(count);
      gl.domElement.dataset.exposurePreviewShutter=String(settings.shutterSpeed);
      gl.domElement.dataset.exposurePreviewPan=settings.panMode;
      gl.domElement.dataset.exposurePreviewTime=String(moment.simulationSeconds);
    }finally{gl.autoClear=autoClear;gl.shadowMap.autoUpdate=shadowUpdate;gl.setClearColor(clear,alpha);gl.setRenderTarget(target)}
  },1);
  return null;
}
