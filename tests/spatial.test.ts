import { it, expect } from "vitest";
import {
  InstancedMesh,
  CylinderGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
  DoubleSide,
} from "three";
import { observer, standGeometry } from "../src/systems/GrandstandGeometry";
import { facilities as f, local } from "../src/data/config";
import { cockpitAt } from "../src/systems/VehicleSimulation";
import { length,at,tangent } from "../src/systems/CircuitGeometry";
it("uses the configured local cockpit anchor in metre world space", () => {
  const a = cockpitAt(length - 220);
  const road=at(length-220),vertical=tangent(length-220).y;
  expect(a.y).toBeCloseTo(road.y+.22+f.car.cockpitHeight*Math.sqrt(1-vertical*vertical)+f.car.cockpitOffset*vertical,8);
  expect(a.distanceTo(road.add(new Vector3(0,.22,0)))).toBeCloseTo(Math.hypot(f.car.cockpitHeight,f.car.cockpitOffset),8);
});
it("physical tyre cylinders obscure a low sightline and clear a high one", () => {
  const t = f.tyres,
    block = new InstancedMesh(
      new CylinderGeometry(t.radius, t.radius, t.thickness, 12),
      new MeshBasicMaterial(),
      t.count * t.layers,
    );
  const m = new Matrix4();
  for (let i = 0; i < t.count * t.layers; i++) {
    m.makeTranslation(
      ...local(
        t.start + Math.floor(i / t.layers) * t.spacing,
        0.3 + (i % t.layers) * t.layerStep,
        t.offset,
      ),
    );
    block.setMatrixAt(i, m);
  }
  block.updateMatrixWorld(true);
  const target = new Vector3(...local(-260, 0.5, 0));
  const low = observer({ tier: "lower", u: 0, v: 0 }),
    high = observer({ tier: "upper", u: 0, v: 1 });
  const hits = (eye: Vector3) =>
    new Raycaster(
      eye,
      target.clone().sub(eye).normalize(),
      0,
      eye.distanceTo(target),
    ).intersectObject(block).length;
  expect(hits(low)).toBeGreaterThan(0);
  expect(hits(high)).toBe(0);
});
it("every tier corner is above its own physical surface", () => {
  for (const tier of ["lower", "upper"] as const) {
    const mesh = new Mesh(
      standGeometry(tier),
      new MeshBasicMaterial({ side: DoubleSide }),
    );
    mesh.updateMatrixWorld(true);
    for (const u of [0.001, 0.999])
      for (const v of [0.001, 0.999]) {
        const eye = observer({ tier, u, v });
        const hit = new Raycaster(eye, new Vector3(0, -1, 0)).intersectObject(
          mesh,
        )[0];
        expect(hit).toBeDefined();
        expect(hit.distance).toBeCloseTo(f.stand.eyeHeight, 4);
      }
  }
});
