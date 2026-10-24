// Compatibility facade: the existing Shanghai engine keeps the same exports and metres.
import raw from "../data/shanghai.geojson?raw";
import { createCircuitGeometry } from "../circuits/geometry";
import data from '../circuits/generated/shanghai.json';
import type {Elevation} from '../circuits/types';
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
  groundAt,
} = createCircuitGeometry(
  JSON.parse(raw).features[0].geometry.coordinates,
  5451,
  data.elevation as unknown as Elevation,
);
