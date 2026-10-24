import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { CircuitPackage } from "../circuits/types";
import type { createCircuitGeometry } from "../circuits/geometry";
import { terrainHeight } from "../circuits/elevation";

export function CornerMarkers({ data, geometry, heightScale=1 }: {data: CircuitPackage; geometry: ReturnType<typeof createCircuitGeometry>; heightScale?:number}) {
  const { gl, camera }=useThree();
  const labels=useRef<HTMLSpanElement[]>([]);
  const points=useMemo(()=>data.corners.map(c=>new Vector3(
    (c.coordinate[0]-geometry.origin[0])*111320*Math.cos(geometry.origin[1]*Math.PI/180)*geometry.calibration,
    (terrainHeight(data.elevation,...c.coordinate)+12)*heightScale,-(c.coordinate[1]-geometry.origin[1])*111320*geometry.calibration)),[data,geometry,heightScale]);
  const projected=useMemo(()=>new Vector3(),[]);
  useEffect(()=>{
    const host=document.createElement('div');host.className='corner-overlay';
    labels.current=data.corners.map(c=>{
      const label=document.createElement('span');label.className='corner-label';label.textContent=`T${c.number}`;
      host.appendChild(label);return label;
    });
    document.body.appendChild(host);
    return ()=>{host.remove();labels.current=[]};
  },[data]);
  useFrame(()=>{
    camera.updateMatrixWorld(true);
    const rect=gl.domElement.getBoundingClientRect(), occupied:{x:number;y:number}[]=[];
    const obstacles=Array.from(document.querySelectorAll('#scene-labels .marker,#scene-labels .timing-tag,.experience-header,.mode-nav,.map-heading,.zone-preview,.map-tools,.terrain-toggle,.explorer-title,.explorer-nav,.explorer-tools,.map-info,.map-orientation'))
      .filter(node=>getComputedStyle(node).visibility!=="hidden").map(node=>node.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
    points.forEach((point,i)=>{
      const label=labels.current[i];if(!label)return;
      projected.copy(point).project(camera);
      const x=rect.left+(projected.x+1)*rect.width/2,y=rect.top+(1-projected.y)*rect.height/2-12;
      const hidden=projected.z>1 || x<rect.left+18 || x>rect.right-18 || y<rect.top+65 || y>rect.bottom-25 || occupied.some(p=>Math.abs(p.x-x)<34&&Math.abs(p.y-y)<24) || obstacles.some(r=>x+18>r.left-4&&x-18<r.right+4&&y+12>r.top-4&&y-12<r.bottom+4);
      label.style.visibility=hidden?'hidden':'visible';
      label.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
      if(!hidden)occupied.push({x,y});
    });
  });
  return null;
}
