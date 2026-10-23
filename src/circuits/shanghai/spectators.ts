// Compatibility facade: Shanghai uses the shared polygon surface implementation.
import raw from "./zones.json";
import type { SpectatorZone } from "../types";
import * as geometry from "../../systems/CircuitGeometry";
import {createSpectators} from "../spectators";
export type {SpectatorSurface} from "../spectators";
export const {spectatorZones,zoneById,nearestTrack,zoneSurfaces,floorHeight,surfacePoint,zonePoint,selectionAt,surfaceGeometry,zonePassCenter}=createSpectators(raw as unknown as SpectatorZone[],geometry);
