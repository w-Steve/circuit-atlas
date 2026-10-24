// Compatibility facade: Shanghai uses the shared polygon surface implementation.
import raw from "./zones.json";
import * as geometry from "../../systems/CircuitGeometry";
import {createSpectators} from "../spectators";
import data from '../generated/shanghai.json';
import {terrainSpectatorZones} from '../spectatorDatum';
import type {CircuitPackage} from '../types';
export type {SpectatorSurface} from "../spectators";
export const {spectatorZones,zoneById,nearestTrack,zoneSurfaces,floorHeight,surfacePoint,zonePoint,selectionAt,surfaceGeometry,zonePassCenter}=createSpectators(terrainSpectatorZones({...data,spectatorZones:raw} as unknown as CircuitPackage),geometry);
