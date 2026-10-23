import { Vector3 } from "three";
export function distance(a: Vector3, b: Vector3) {
  return a.distanceTo(b);
}
export function angularVelocity(
  observer: Vector3,
  position: Vector3,
  velocity: Vector3,
) {
  const r = position.clone().sub(observer);
  return ((r.clone().cross(velocity).length() / r.lengthSq()) * 180) / Math.PI;
}
export function angleBetween(a: Vector3, b: Vector3, o: Vector3) {
  return (a.clone().sub(o).angleTo(b.clone().sub(o)) * 180) / Math.PI;
}
