import type {PerspectiveCamera,Vector3} from 'three';
/** Secondary race annotations disappear beyond three metres per screen pixel. */
export function timingDetailVisible(camera:PerspectiveCamera,target:Vector3,height:number){
 return 2*camera.position.distanceTo(target)*Math.tan(camera.fov*Math.PI/360)/Math.max(1,height)<=3;
}
