import { it, expect } from "vitest";
import { PerspectiveCamera } from "three";
import {loadCircuit} from '../src/circuits/registry';
import {createCircuitContext} from '../src/app/CircuitContext';
import {Vector3} from 'three';
it("fits the complete Shanghai layout in portrait and landscape overview cameras", async () => {
  const runtime=createCircuitContext(await loadCircuit('shanghai')),geoPoints=runtime.geometry.geoPoints,overviewCenter=runtime.mapCenter;
  const overviewPosition=(aspect:number)=>{const span=runtime.bounds.getSize(new Vector3()),d=Math.max(span.z,span.x/aspect)*1.3;return overviewCenter.clone().add(new Vector3(0,d,d*.58))};
  for (const aspect of [0.4, 0.7, 1, 1.5, 2.2]) {
    const camera = new PerspectiveCamera(50, aspect, 5, 12000);
    camera.position.copy(overviewPosition(aspect));
    camera.lookAt(overviewCenter);
    camera.updateMatrixWorld(true);
    for (const point of geoPoints) {
      const p = point.clone().project(camera);
      expect(Math.abs(p.x)).toBeLessThan(1);
      expect(Math.abs(p.y)).toBeLessThan(1);
      expect(Math.abs(p.z)).toBeLessThan(1);
    }
  }
});
