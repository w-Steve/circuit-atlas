import { it, expect } from "vitest";
import { PerspectiveCamera } from "three";
import {
  overviewCenter,
  overviewPosition,
} from "../src/systems/ObserverCamera";
import { geoPoints } from "../src/systems/CircuitGeometry";
it("fits the complete Shanghai layout in portrait and landscape overview cameras", () => {
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
