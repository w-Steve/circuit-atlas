import { at, tangent, length } from "../systems/CircuitGeometry";
import {shanghaiTiming} from '../circuits/shanghai/timing';
// Main straight local frame; positive offset points towards grandstand A.
export const straight = at(length - 220);
export const along = tangent(length - 220).setY(0).normalize();
// One level engineering foundation for the existing A stand and pit building.
// All original tier dimensions remain relative to this road datum.
export const foundationAltitude = straight.y;
export const outward = { x: along.z, z: -along.x };
export const facilities = {
  roadWidth: 14,
  stand: {
    length: 380,
    frontOffset: 32,
    lowerDepth: 18,
    lowerBase: 3,
    lowerRise: 10,
    upperOffset: 55,
    upperDepth: 23,
    upperBase: 17,
    upperRise: 15,
    eyeHeight: 1.2,
    roofHeight: 38,
    roofDepth: 42,
    roofOffset: 67,
  },
  pit: { length: 340, offset: -42, width: 24, height: 15 },
  start: { distance: shanghaiTiming.start },
  finish: { distance: shanghaiTiming.control },
  fence: { offset: 13, height: 3.5 },
  tyres: {
    start: -256,
    count: 30,
    spacing: 0.72,
    offset: 9,
    layers: 4,
    radius: 0.43,
    thickness: 0.5,
    layerStep: 0.52,
  },
  car: {
    length: 5.2,
    width: 1.9,
    wheelbase: 3.4,
    height: 0.95,
    cockpitHeight: 0.75,
    cockpitOffset: -0.4,
  },
  provenance: "设施全部为可校准估算；非测绘或座位承诺",
};
export function local(x: number, y: number, z: number) {
  return [
    straight.x + along.x * x + outward.x * z,
    y + foundationAltitude,
    straight.z + along.z * x + outward.z * z,
  ] as [number, number, number];
}
