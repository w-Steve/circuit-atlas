// Compatibility facade: the existing Shanghai engine keeps the same exports and metres.
import raw from "../data/shanghai.geojson?raw";
import { createCircuitGeometry } from "../circuits/geometry";
export const {
  origin,
  geoPoints,
  track,
  rawLength,
  calibration,
  length,
  at,
  tangent,
  ribbon,
} = createCircuitGeometry(
  JSON.parse(raw).features[0].geometry.coordinates,
  5451,
);
