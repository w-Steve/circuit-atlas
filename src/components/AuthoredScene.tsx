import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {BufferGeometry,Float32BufferAttribute,Matrix4,Quaternion,Vector3,Color,type InstancedMesh} from 'three';
import {useCircuit} from '../app/CircuitContext';
import {Html} from '@react-three/drei';
import {t} from '../i18n';
/** Metric authored details use the same renderer for every circuit. Repeated
 * garage panels, posts and tyres are instanced rather than separate draw calls. */
export function AuthoredScene(){
 const {data,store}=useCircuit(),details=data.scene,mode=store(s=>s.mode);
 const boxes=useRef<InstancedMesh>(null),cylinders=useRef<InstancedMesh>(null);
 const wires=useMemo(()=>{
  const points:number[]=[];
  for(const f of details?.wireMeshes??[]){
   const p=(x:number,y:number)=>[f.origin[0]+f.along[0]*x+f.normal[0]*f.offset,f.origin[1]+y,f.origin[2]+f.along[1]*x+f.normal[1]*f.offset];
   for(let i=0;i<12;i++)points.push(...p(f.start,.2+i*.3),...p(f.end,.2+i*.3));
   for(let x=f.start;x<f.end;x+=.6)for(let y=0;y+.3<=f.height;y+=.3)points.push(...p(x,y),...p(Math.min(f.end,x+.6),y+.3),...p(x,y+.3),...p(Math.min(f.end,x+.6),y));
  }
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(points,3));return g;
 },[details]);
 useEffect(()=>()=>wires.dispose(),[wires]);
 useLayoutEffect(()=>{
  if(!details)return;
  const matrix=new Matrix4(),q=new Quaternion(),axis=new Vector3(0,1,0);
  details.boxes.forEach((b,i)=>{matrix.compose(new Vector3(...b.position),q.setFromAxisAngle(axis,b.rotation),new Vector3(...b.size));boxes.current!.setMatrixAt(i,matrix);boxes.current!.setColorAt(i,new Color(b.color))});
  details.cylinders.forEach((b,i)=>{matrix.compose(new Vector3(...b.position),q.identity(),new Vector3(b.radius,b.height,b.radius));cylinders.current!.setMatrixAt(i,matrix);cylinders.current!.setColorAt(i,new Color(b.color))});
  for(const mesh of [boxes.current,cylinders.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere()}
 },[details]);
 if(!details)return null;
 return <group name="authored-facilities">{mode==='overview'&&details.landmarks?.map(l=><Html key={l.label} center position={l.labelPosition} portal={{current:document.getElementById('scene-labels')!}}><span className="marker facility-marker">{t(l.label)}</span></Html>)}<instancedMesh ref={boxes} args={[undefined,undefined,details.boxes.length]} castShadow receiveShadow><boxGeometry/><meshStandardMaterial roughness={.8}/></instancedMesh><instancedMesh ref={cylinders} args={[undefined,undefined,details.cylinders.length]}><cylinderGeometry args={[1,1,1,12]}/><meshStandardMaterial roughness={.95}/></instancedMesh><lineSegments geometry={wires}><lineBasicMaterial color="#263b32" transparent opacity={.92} depthWrite={false}/></lineSegments></group>;
}
