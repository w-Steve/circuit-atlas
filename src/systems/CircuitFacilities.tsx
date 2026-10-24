import {t} from "../i18n";
import {useEffect,useMemo} from 'react';
import {Html} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {Line3,Vector3} from 'three';
import type {CircuitPackage} from '../circuits/types';
import type {createCircuitGeometry} from '../circuits/geometry';
import {buildingModel,pitLaneModel} from '../circuits/facilityGeometry';
import {useApp} from '../store';
type Geometry=ReturnType<typeof createCircuitGeometry>;
export function CircuitFacilities({data,geometry}:{data:CircuitPackage;geometry:Geometry}){
 const mode=useApp(s=>s.mode);
 const {gl}=useThree();
 const models=useMemo(()=>({buildings:(data.facilities?.buildings??[]).map(b=>({...buildingModel(data,geometry,b),id:b.id})),lanes:(data.facilities?.pitLanes??[]).filter(l=>!l.underground).map(l=>pitLaneModel(data,geometry,l))}),[data,geometry]);
 useEffect(()=>{gl.domElement.dataset.facilityBuildings=String(models.buildings.length);gl.domElement.dataset.facilityLanes=String(models.lanes.length)},[gl,models]);
 useEffect(()=>()=>{models.buildings.forEach(b=>{b.walls.dispose();b.roof.dispose()});models.lanes.forEach(l=>l.geometry.dispose())},[models]);
 const panels=useMemo(()=>{
  const segments=models.lanes.flatMap(l=>l.points.slice(0,-1).map((p,i)=>new Line3(p,l.points[i+1])));
  const all:{position:[number,number,number];rotation:number;width:number;glass:boolean}[]=[];
  for(const b of models.buildings)b.points.forEach((p,i)=>{
   const q=b.points[(i+1)%b.points.length],length=p.distanceTo(q);if(length<9||!segments.length)return;
   const mid=p.clone().lerp(q,.5),nearest=segments.map(s=>s.closestPointToPoint(mid,true,new Vector3())).sort((a,c)=>a.distanceToSquared(mid)-c.distanceToSquared(mid))[0];
   const toward=nearest.clone().sub(mid).setY(0),edge=q.clone().sub(p).setY(0).normalize();
   if(toward.length()>35||toward.length()<1||Math.abs(toward.clone().normalize().dot(edge))>.55)return;
   // Repeated openings are schematic facade detail; this is not a garage allocation.
   const count=Math.floor(length/9),rotation=Math.atan2(-edge.z,edge.x),normal=toward.normalize().multiplyScalar(.05);
   for(let j=0;j<count;j++){
    const point=p.clone().lerp(q,(j+.5)/count).add(normal);
    all.push({position:[point.x,b.base+2,point.z],rotation,width:length/count*.82,glass:false});
    if(b.height>8)all.push({position:[point.x,b.base+b.height*.7,point.z],rotation,width:length/count*.92,glass:true});
   }
  });return all;
 },[models]);
 return <group name="circuit-facilities">
  {models.lanes.map((l,i)=><mesh key={i} geometry={l.geometry}><meshStandardMaterial color="#68716c" side={2} roughness={.95}/></mesh>)}
  {models.buildings.map(b=><group key={b.id}><mesh geometry={b.walls} name={`pit-building-${b.id}`}><meshStandardMaterial color="#a7afa8" side={2} roughness={.85}/></mesh><mesh geometry={b.roof}><meshStandardMaterial color="#596961" side={2} roughness={.9}/></mesh></group>)}
  {panels.map((p,i)=><mesh key={i} position={p.position} rotation={[0,p.rotation,0]}><boxGeometry args={[p.width,p.glass?1.5:3.5,.1]}/><meshStandardMaterial color={p.glass?'#3f565b':'#26332f'} roughness={p.glass?.35:.85}/></mesh>)}
  {mode==='overview'&&models.buildings[0]&&<Html center portal={{current:document.getElementById('scene-labels')!}} position={models.buildings[0].center.clone().setY(models.buildings[0].base+models.buildings[0].height+12)}><span className="marker facility-marker">{t("P 房 / PIT")}</span></Html>}
 </group>;
}
