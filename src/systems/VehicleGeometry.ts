import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
// Bevel within the existing physical envelope, including thin wing elements.
export function bodyPartGeometry(size:[number,number,number]){
  return new RoundedBoxGeometry(...size,2,Math.min(...size,.12)/3);
}
