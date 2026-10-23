import { describe, it, expect } from "vitest";
import { parseRoute, circuitPath } from "../src/app/navigation";
import { loadCircuit, circuitRegistry } from "../src/circuits/registry";
import { createCircuitGeometry } from "../src/circuits/geometry";
import { at, length } from "../src/systems/CircuitGeometry";
describe("Phase 2 navigation and data compatibility", () => {
  it("parses three product levels and camera deep links", () => {
    expect(parseRoute("")).toEqual({ level: "catalog" });
    expect(parseRoute(circuitPath("shanghai"))).toEqual({
      level: "circuit",
      circuitId: "shanghai",
      zoneId: "a",
      mode: "overview",
    });
    for (const mode of ["select", "eye", "phone"] as const)
      expect(parseRoute(circuitPath("shanghai", mode))).toEqual({
        level: "circuit",
        circuitId: "shanghai",
        zoneId: "a",
        mode,
      });
    expect(parseRoute("#/invalid")).toEqual({ level: "not-found" });
  });
  it("loads a data package without UI and preserves all legacy Shanghai positions", async () => {
    const data = await loadCircuit("shanghai");
    expect(data.season).toBe(2026);
    expect(data.elevation.status).toBe("unavailable");
    const generic = createCircuitGeometry(
      data.trackGeometry.coordinates,
      data.lengthMetres,
    );
    expect(generic.length).toBe(length);
    for (const s of [0, 1, 50, 1000, 5000])
      expect(generic.at(s).distanceTo(at(s))).toBe(0);
    expect(new Set(circuitRegistry.map((c) => c.circuitId)).size).toBe(
      circuitRegistry.length,
    );
  });
  it("rejects unknown data and invalid geometry instead of fabricating a map", async () => {
    await expect(loadCircuit("not-real")).rejects.toThrow("Unknown circuit");
    expect(() =>
      createCircuitGeometry(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
        1000,
      ),
    ).toThrow("not closed");
    expect(() =>
      createCircuitGeometry(
        [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
        1000,
      ),
    ).toThrow("Degenerate");
  });
});
