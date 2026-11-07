import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {Matrix4,Quaternion,Vector3,type InstancedMesh} from 'three';
import {useThree} from '@react-three/fiber';
import {useCircuit} from '../app/CircuitContext';
import {barrierGeometry,circuitBarriers} from '../circuits/barrierGeometry';

export function SourcedBarriers(){
 const {data,geometry}=useCircuit(),{gl}=useThree(),posts=useRef<InstancedMesh>(null);
 const model=useMemo(()=>barrierGeometry(data,geometry),[data,geometry]);
 useEffect(()=>()=>{model.wires.dispose();model.solids.dispose()},[model]);
 useLayoutEffect(()=>{
  const mesh=posts.current;if(!mesh)return;const matrix=new Matrix4(),rotation=new Quaternion();
  model.posts.forEach((p,i)=>mesh.setMatrixAt(i,matrix.compose(p.position.clone().add(new Vector3(0,p.height/2,0)),rotation,new Vector3(.045,p.height,.045))));
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
 },[model]);
 useEffect(()=>{const barriers=circuitBarriers(data);gl.domElement.dataset.sourcedBarriers=String(barriers.length);gl.domElement.dataset.sourcedBarrierIds=JSON.stringify(barriers.map(b=>b.id))},[gl,data]);
 if(!model.posts.length&&!model.solids.getAttribute('position').count)return null;
 return <group name="sourced-trackside-barriers"><lineSegments geometry={model.wires}><lineBasicMaterial color="#263b32" transparent opacity={.92}/></lineSegments>{model.posts.length>0&&<instancedMesh ref={posts} args={[undefined,undefined,model.posts.length]}><cylinderGeometry args={[1,1,1,6]}/><meshStandardMaterial color="#687773" roughness={.7}/></instancedMesh>}{model.solids.getAttribute('position').count>0&&<mesh geometry={model.solids}><meshStandardMaterial color="#777c76" roughness={.95} side={2}/></mesh>}</group>;
}
