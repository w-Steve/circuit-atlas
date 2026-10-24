import { describe, it, expect } from "vitest";
import {
  observer,
  validSelection,
  tierData,
} from "../src/systems/GrandstandGeometry";
import { facilities as f, local,foundationAltitude } from "../src/data/config";
import { useApp } from "../src/store";
describe("A grandstand and camera mapping", () => {
  it("rejects gap/out-of-range/nonfinite selections", () => {
    for (const s of [
      { tier: "lower", u: -0.1, v: 0.5 },
      { tier: "upper", u: 0.5, v: 1.1 },
      { tier: "lower", u: NaN, v: 0 },
    ])
      expect(validSelection(s as never)).toBe(false);
    expect(() => observer({ tier: "lower", u: 2, v: 0 })).toThrow();
  });
  it("maps both independent tiers to slope plus seated eye height", () => {
    for (const tier of ["lower", "upper"] as const) {
      const t = tierData(tier);
      for (const v of [0, 0.25, 1]) {
        const p = observer({ tier, u: 0.5, v });
        expect(p.y).toBeCloseTo(foundationAltitude + t.base + t.rise * v + f.stand.eyeHeight);
        const q = local(0, p.y-foundationAltitude, t.offset + t.depth * v);
        expect(p.toArray()).toEqual(q);
      }
    }
  });
  it("keeps separated upper/lower selectable surfaces", () => {
    expect(tierData("upper").offset).toBeGreaterThan(
      tierData("lower").offset + tierData("lower").depth,
    );
  });
  it("clamps pointer positions and preserves selection across modes", () => {
    useApp.getState().select({ tier: "upper", u: 2, v: -2 });
    expect(useApp.getState().selection).toEqual({ tier: "upper", u: 1, v: 0 });
    const p = observer(useApp.getState().selection);
    for (const mode of ["eye", "select", "overview", "eye"] as const) {
      useApp.getState().setMode(mode);
      expect(observer(useApp.getState().selection).equals(p)).toBe(true);
    }
  });
});
