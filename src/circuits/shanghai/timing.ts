import data from '../generated/shanghai.json';
import source from '../timing/shanghai.json';
import type {CircuitPackage,CircuitTiming} from '../types';
import * as geometry from '../../systems/CircuitGeometry';
import {resolveTiming} from '../timingGeometry';
export const shanghaiTimingSource=source as unknown as CircuitTiming;
export const shanghaiTiming=resolveTiming(data as unknown as CircuitPackage,geometry,shanghaiTimingSource);
