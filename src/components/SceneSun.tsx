import {useMemo,useLayoutEffect} from 'react';
import {Object3D} from 'three';
import {useCircuit} from '../app/CircuitContext';
export function SceneSun(){
 const runtime=useCircuit(),selection=runtime.store(s=>s.selection),point=runtime.observer(selection),target=useMemo(()=>new Object3D(),[]);
 useLayoutEffect(()=>{target.position.set(point.x,0,point.z);target.updateMatrixWorld(true)},[target,point.x,point.z]);
 return <><primitive object={target}/><directionalLight position={[point.x+100,500,point.z+100]} target={target} intensity={2.4} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-180} shadow-camera-right={180} shadow-camera-top={180} shadow-camera-bottom={-180} shadow-camera-near={1} shadow-camera-far={1000} shadow-bias={-.00015} shadow-normalBias={.04}/></>;
}
