import {Box3,PerspectiveCamera,Vector3} from 'three';

/** Fit a whole seating envelope into the part of the viewport clear of UI.
 * Operates on the overview camera only; never changes the spectator's eye. */
export function selectionFraming(bounds:Box3,towardTrack:Vector3,width:number,height:number){
 const center=bounds.getCenter(new Vector3()),direction=towardTrack.clone().setY(0).normalize();
 if(direction.lengthSq()<.1)direction.set(0,0,1);
 direction.y=.91;direction.normalize();
 const right=new Vector3().crossVectors(new Vector3(0,1,0),direction).normalize(),up=new Vector3().crossVectors(direction,right).normalize();
 const landscape=height<600&&width>height;
 const roi=landscape?{left:-.12,right:.88,bottom:-.8,top:.48}:{left:-.86,right:.86,bottom:-.30,top:.74};
 const shiftX=(roi.left+roi.right)/2,shiftY=(roi.bottom+roi.top)/2;
 const tanV=Math.tan(50*Math.PI/360),tanH=tanV*width/height;
 const corners:Vector3[]=[];let distance=80;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const p=new Vector3(x,y,z);corners.push(p);const delta=p.clone().sub(center),r=delta.dot(right),u=delta.dot(up),d=delta.dot(direction);
  distance=Math.max(distance,(r+roi.right*d*tanH)/((roi.right-shiftX)*tanH),(-r-roi.left*d*tanH)/((shiftX-roi.left)*tanH),
   (u+roi.top*d*tanV)/((roi.top-shiftY)*tanV),(-u-roi.bottom*d*tanV)/((shiftY-roi.bottom)*tanV));
 }
 distance*=1.08;
 const target=center.clone().addScaledVector(right,-shiftX*distance*tanH).addScaledVector(up,-shiftY*distance*tanV);
 const position=target.clone().addScaledVector(direction,distance);
 return {center,target,position,distance,roi,corners};
}
export function selectionEnvelopeProjection(bounds:Box3,camera:PerspectiveCamera){
 const points=[];
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new Vector3(x,y,z).project(camera));
 return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),bottom:Math.min(...points.map(p=>p.y)),top:Math.max(...points.map(p=>p.y))};
}
