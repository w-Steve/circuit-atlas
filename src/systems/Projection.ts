import { Matrix4, Mesh, Object3D, PerspectiveCamera, Vector4 } from "three";
// Sutherland–Hodgman clipping in homogeneous clip coordinates. Unlike a size/distance
// approximation this handles actual mesh orientation, near plane, off-screen and cropping.
const planes = [
  (v: Vector4) => v.x + v.w,
  (v: Vector4) => v.w - v.x,
  (v: Vector4) => v.y + v.w,
  (v: Vector4) => v.w - v.y,
  (v: Vector4) => v.z + v.w,
  (v: Vector4) => v.w - v.z,
];
export type Projection = {
  widthPercent: number;
  angularWidth: number;
  state: "inside" | "cropped" | "outside";
};
export function projectVehicle(
  object: Object3D,
  camera: PerspectiveCamera,
): Projection {
  camera.updateMatrixWorld();
  object.updateMatrixWorld(true);
  let min = Infinity,
    max = -Infinity,
    cut = false,
    visible = false;
  const matrix = new Matrix4();
  object.traverse((o) => {
    if (!(o instanceof Mesh) || !o.visible) return;
    matrix
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .multiply(o.matrixWorld);
    const a = o.geometry.attributes.position,
      idx = o.geometry.index;
    const count = idx ? idx.count : a.count;
    for (let i = 0; i < count; i += 3) {
      let poly: Vector4[] = [];
      for (let k = 0; k < 3; k++) {
        const j = idx ? idx.getX(i + k) : i + k;
        poly.push(
          new Vector4(a.getX(j), a.getY(j), a.getZ(j), 1).applyMatrix4(matrix),
        );
      }
      if (poly.some((v) => planes.some((p) => p(v) < 0))) cut = true;
      for (const plane of planes) {
        const out: Vector4[] = [];
        for (let j = 0; j < poly.length; j++) {
          const a = poly[j],
            b = poly[(j + 1) % poly.length],
            da = plane(a),
            db = plane(b);
          if (da >= 0) out.push(a);
          if (da >= 0 !== db >= 0) out.push(a.clone().lerp(b, da / (da - db)));
        }
        poly = out;
        if (!poly.length) break;
      }
      for (const v of poly) {
        if (v.w > 1e-9) {
          visible = true;
          const x = v.x / v.w;
          min = Math.min(min, x);
          max = Math.max(max, x);
        }
      }
    }
  });
  const scale = Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
  return visible
    ? {
        widthPercent: Math.max(0, Math.min(100, (max - min) * 50)),
        angularWidth:
          ((Math.atan(max * scale) - Math.atan(min * scale)) * 180) / Math.PI,
        state: cut ? "cropped" : "inside",
      }
    : { widthPercent: 0, angularWidth: 0, state: "outside" };
}
