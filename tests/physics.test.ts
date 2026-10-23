import { describe, it, expect } from "vitest";
import {
  Vector3,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
  PerspectiveCamera,
} from "three";
import {
  VehicleSimulation,
  passStart,
  SimulationClock,
} from "../src/systems/VehicleSimulation";
import { distance, angularVelocity } from "../src/systems/MeasurementSystem";
import { projectVehicle } from "../src/systems/Projection";
describe("physical time and measurement", () => {
  it("moves 55.5556m in one second at 200 km/h (1 micrometre tolerance)", () => {
    const v = new VehicleSimulation();
    v.play();
    v.advance(1);
    expect(v.distance - passStart).toBeCloseTo(200 / 3.6, 6);
  });
  it("is invariant across 15,30,60,144 fps", () => {
    for (const fps of [15, 30, 60, 144]) {
      const v = new VehicleSimulation();
      v.play();
      for (let i = 0; i < fps * 5; i++) v.advance(1 / fps);
      expect(v.distance - passStart).toBeCloseTo((5 * 200) / 3.6, 6);
    }
  });
  it("pauses, resumes and replays only at a defined stopped origin", () => {
    const v = new VehicleSimulation();
    v.play();
    v.advance(2);
    v.pause();
    const d = v.distance;
    v.advance(10);
    expect(v.distance).toBe(d);
    v.play();
    v.advance(1);
    expect(v.distance).toBeCloseTo(d + 200 / 3.6);
    v.replay();
    expect(v.distance).toBe(passStart);
    expect(v.status).toBe("ready");
  });
  it("resets the real clock across visibility/page restoration", () => {
    const c = new SimulationClock();
    expect(c.tick(1000)).toBe(0);
    expect(c.tick(2000)).toBe(1);
    expect(c.tick(20000, false)).toBe(0);
    expect(c.tick(80000)).toBe(0);
    expect(c.tick(81000)).toBe(1);
    c.reset();
    expect(c.tick(200000)).toBe(0);
  });
  it("measures Euclidean distance and transverse angular speed", () => {
    expect(distance(new Vector3(1, 2, 3), new Vector3(4, 6, 3))).toBe(5);
    expect(
      angularVelocity(
        new Vector3(),
        new Vector3(0, 0, 100),
        new Vector3(50, 0, 0),
      ),
    ).toBeCloseTo((0.5 * 180) / Math.PI);
  });
});
describe("actual geometry projection", () => {
  const camera = () => {
    const c = new PerspectiveCamera(60, 4 / 3, 0.1, 1000);
    c.updateProjectionMatrix();
    return c;
  };
  it("changes with distance and car orientation", () => {
    const c = camera(),
      m = new Mesh(new BoxGeometry(1.9, 1, 5.2), new MeshBasicMaterial());
    m.position.z = -60;
    const front = projectVehicle(m, c).widthPercent;
    m.rotation.y = Math.PI / 2;
    const side = projectVehicle(m, c).widthPercent;
    expect(side).toBeGreaterThan(front * 2);
    m.position.z = -120;
    expect(projectVehicle(m, c).widthPercent).toBeLessThan(side * 0.6);
  });
  it("clips partial visibility and rejects offscreen or behind camera", () => {
    const c = camera(),
      m = new Mesh(new BoxGeometry(3, 1, 3));
    m.position.set(0, 0, -10);
    expect(projectVehicle(m, c).state).toBe("inside");
    m.position.x = 8;
    expect(projectVehicle(m, c).state).toBe("cropped");
    m.position.x = 100;
    expect(projectVehicle(m, c).state).toBe("outside");
    m.position.set(0, 0, 10);
    expect(projectVehicle(m, c).widthPercent).toBe(0);
  });
});
