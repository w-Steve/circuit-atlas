import {it,expect} from 'vitest';
import {Vector3} from 'three';
import {bodyPartGeometry} from '../src/systems/VehicleGeometry';
it('visual bevels preserve the real dimensional envelope, including thin wing components',()=>{
  for(const size of [[1.9,.16,.28],[.05,.7,.33],[.88,.44,2.2],[5.2,.12,.66]] as [number,number,number][]){
    const geometry=bodyPartGeometry(size);geometry.computeBoundingBox();const actual=geometry.boundingBox!.getSize(new Vector3());
    actual.toArray().forEach((n,i)=>expect(n).toBeCloseTo(size[i],6));geometry.dispose();
  }
});
