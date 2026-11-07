import type {Camera,Object3D,WebGLRenderer} from 'three';
interface Program {isReady:()=>boolean}
type Renderer=Pick<WebGLRenderer,'compile'|'properties'>;

/** Three r180 compileAsync polls material.currentProgram after disposal, outside
 * its Promise rejection handler. Own the timer and snapshot program references
 * so route unmount/material disposal can cancel pending checks safely. */
export function warmSceneShaders(renderer:Renderer,scene:Object3D,camera:Camera,onReady:()=>void,onError:(error:unknown)=>void){
 let stopped=false,timer:ReturnType<typeof setTimeout>|undefined;
 const pending=new Map<Program,number>(),detach:(()=>void)[]=[];
 const cleanup=()=>{if(timer!==undefined)clearTimeout(timer);detach.forEach(fn=>fn());detach.length=0;pending.clear()};
 const cancel=()=>{stopped=true;cleanup()};
 try{
  for(const material of renderer.compile(scene,camera)){
   const properties=renderer.properties.get(material) as {currentProgram?:Program}|undefined;
   const program=properties?.currentProgram;
   if(!program||typeof program.isReady!=='function')continue;
   pending.set(program,(pending.get(program)??0)+1);
   const dispose=()=>{const count=pending.get(program)??0;if(count<=1)pending.delete(program);else pending.set(program,count-1)};
   material.addEventListener('dispose',dispose);detach.push(()=>material.removeEventListener('dispose',dispose));
  }
 }catch(error){cancel();onError(error);return cancel}
 const poll=()=>{
  if(stopped)return;
  try{for(const program of pending.keys())if(program.isReady())pending.delete(program)}
  catch(error){cancel();onError(error);return}
  if(!pending.size){cancel();onReady()}else timer=setTimeout(poll,10);
 };
 timer=setTimeout(poll,10);
 return cancel;
}
