import { it, expect } from "vitest";
import { PerspectiveCamera, Mesh, BoxGeometry } from "three";
import { focalToFov, zoomToFov, phoneSensor } from "../src/systems/PhoneCamera";
import { projectVehicle } from "../src/systems/Projection";
import {createAppStore} from '../src/store';
const useApp=createAppStore();
it('permits telephoto zoom through 30x with finite projection',()=>{
  useApp.getState().setZoom(20);expect(useApp.getState().zoom).toBe(20);
  useApp.getState().setZoom(30);expect(useApp.getState().zoom).toBe(30);
  expect(zoomToFov(30)).toBeGreaterThan(0);expect(zoomToFov(30)).toBeLessThan(zoomToFov(5));
  useApp.getState().setZoom(1);
});
it("uses a 43.27mm-equivalent diagonal with 4:3 crop", () => {
  const height = (phoneSensor.diagonal * 3) / 5;
  expect(focalToFov(24)).toBeCloseTo(
    (2 * Math.atan(height / 48) * 180) / Math.PI,
    8,
  );
  expect(zoomToFov(5)).toBeLessThan(zoomToFov(1));
  expect(zoomToFov(0.5)).toBeGreaterThan(zoomToFov(1));
});
it("changes camera projection with zoom without changing physical size or distance", () => {
  const c = new PerspectiveCamera(zoomToFov(1), 4 / 3, 0.1, 1000),
    m = new Mesh(new BoxGeometry(1.9, 0.95, 5.2));
  m.position.set(0, 0, -100);
  const before = m.geometry.boundingBox;
  const one = projectVehicle(m, c).widthPercent;
  c.fov = zoomToFov(3);
  c.updateProjectionMatrix();
  const three = projectVehicle(m, c).widthPercent;
  expect(three / one).toBeCloseTo(3, 6);
  expect(m.position.z).toBe(-100);
  expect(m.geometry.boundingBox).toBe(before);
});
