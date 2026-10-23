import type {createCircuitGeometry} from './geometry';
import type {SpectatorModel} from './spectators';
import type {CircuitPackage} from './types';
// Optional adapter. Null preserves the original Shanghai engine exactly.
export const circuitRuntime:{current:null|{data:CircuitPackage;geometry:ReturnType<typeof createCircuitGeometry>;spectators:SpectatorModel}}={current:null};
