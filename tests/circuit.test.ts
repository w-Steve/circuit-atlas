import { describe, it, expect } from "vitest";
import {
  track,
  length,
  rawLength,
  calibration,
  at,
  ribbon,
} from "../src/systems/CircuitGeometry";
describe("Shanghai circuit geometry", () => {
  it("closes its full racing layout", () => {
    expect(track.getPointAt(0).distanceTo(track.getPointAt(1))).toBeLessThan(
      1e-6,
    );
  });
  it("calibrates published length without excessive distortion", () => {
    expect(length).toBeCloseTo(5451, 1);
    expect(Math.abs(calibration - 1)).toBeLessThan(0.05);
    expect(rawLength).toBeGreaterThan(5200);
  });
  it("uses metres and wraps arc distance", () => {
    expect(at(0).distanceTo(at(length))).toBeLessThan(1e-6);
    expect(at(10).distanceTo(at(11))).toBeCloseTo(1, 2);
  });
  it("generates finite continuous road geometry", () => {
    const g = ribbon(14);
    expect(Array.from(g.attributes.position.array).every(Number.isFinite)).toBe(
      true,
    );
    expect(g.index?.count).toBe(14400);
  });
});

it("has no non-adjacent centreline crossings", () => {
  const p = Array.from({ length: 1201 }, (_, i) => track.getPointAt(i / 1200));
  const cross = (a: (typeof p)[0], b: (typeof p)[0], c: (typeof p)[0]) =>
    (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  const crossings: number[][] = [];
  for (let i = 0; i < 1200; i++)
    for (let j = i + 2; j < 1200; j++) {
      if (i === 0 && j === 1199) continue;
      if (
        cross(p[i], p[i + 1], p[j]) * cross(p[i], p[i + 1], p[j + 1]) < 0 &&
        cross(p[j], p[j + 1], p[i]) * cross(p[j], p[j + 1], p[i + 1]) < 0
      )
        crossings.push([i, j]);
    }
  expect(crossings).toEqual([]);
});
it("joins both road edges without a seam", () => {
  const a = ribbon(14).attributes.position;
  for (let edge = 0; edge < 2; edge++)
    for (let axis = 0; axis < 3; axis++)
      expect(a.array[edge * 3 + axis]).toBeCloseTo(
        a.array[(4800 + edge) * 3 + axis],
        5,
      );
});
