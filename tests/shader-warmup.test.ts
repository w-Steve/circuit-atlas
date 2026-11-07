import {afterEach,expect,it,vi} from 'vitest';
import {Camera,MeshBasicMaterial,Scene,type WebGLRenderer} from 'three';
import {warmSceneShaders} from '../src/camera/ShaderWarmup';
afterEach(()=>{vi.useRealTimers()});
function fixture(count=1){
 const materials=Array.from({length:count},()=>new MeshBasicMaterial()),isReady=vi.fn(()=>false),program={isReady},properties=new Map(materials.map(m=>[m,{currentProgram:program}]));
 const renderer={compile:()=>new Set(materials),properties:{get:(m:typeof materials[number])=>properties.get(m)}} as unknown as Pick<WebGLRenderer,'compile'|'properties'>;
 return {renderer,materials,properties,isReady,scene:new Scene(),camera:new Camera(),ready:vi.fn(),error:vi.fn()};
}
it('waits for parallel compilation and completes only once',()=>{
 vi.useFakeTimers();const f=fixture();warmSceneShaders(f.renderer,f.scene,f.camera,f.ready,f.error);vi.advanceTimersByTime(10);expect(f.ready).not.toHaveBeenCalled();f.isReady.mockReturnValue(true);vi.advanceTimersByTime(30);expect(f.ready).toHaveBeenCalledTimes(1);expect(f.error).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('cancels all pending polling when its Canvas unmounts',()=>{
 vi.useFakeTimers();const f=fixture(),cancel=warmSceneShaders(f.renderer,f.scene,f.camera,f.ready,f.error);cancel();f.properties.clear();f.materials[0].dispose();vi.advanceTimersByTime(50);expect(f.isReady).not.toHaveBeenCalled();expect(f.ready).not.toHaveBeenCalled();expect(f.error).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('does not query a disposed program after its material properties disappear',()=>{
 vi.useFakeTimers();const f=fixture();warmSceneShaders(f.renderer,f.scene,f.camera,f.ready,f.error);f.properties.clear();f.materials[0].dispose();f.isReady.mockImplementation(()=>{throw Error('deleted GL program')});vi.advanceTimersByTime(20);expect(f.isReady).not.toHaveBeenCalled();expect(f.ready).toHaveBeenCalledTimes(1);expect(f.error).not.toHaveBeenCalled();
});
it('keeps a shared program pending while another material still owns it',()=>{
 vi.useFakeTimers();const f=fixture(2);warmSceneShaders(f.renderer,f.scene,f.camera,f.ready,f.error);f.materials[0].dispose();vi.advanceTimersByTime(10);expect(f.isReady).toHaveBeenCalledTimes(1);expect(f.ready).not.toHaveBeenCalled();f.isReady.mockReturnValue(true);vi.advanceTimersByTime(10);expect(f.ready).toHaveBeenCalledTimes(1);
});
it('reports polling failures through the owned callback rather than an unhandled timer',()=>{
 vi.useFakeTimers();const f=fixture();f.isReady.mockImplementation(()=>{throw Error('lost GPU')});warmSceneShaders(f.renderer,f.scene,f.camera,f.ready,f.error);expect(()=>vi.runAllTimers()).not.toThrow();expect(f.error).toHaveBeenCalledTimes(1);expect(f.ready).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
