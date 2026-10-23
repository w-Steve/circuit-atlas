// Compatibility import path; the registry and legacy users share one package.
import raw from "../generated/shanghai.json";
import type { CircuitPackage } from "../types";
const data = raw as unknown as CircuitPackage;
export default data;
