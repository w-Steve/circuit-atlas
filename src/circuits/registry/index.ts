import summaries from "../generated/summaries.json";
import type { CircuitPackage, CircuitSummary } from "../types";
export const circuitRegistry = summaries as readonly CircuitSummary[];
const loaders = import.meta.glob<{ default: CircuitPackage }>(["../generated/*.json", "!../generated/summaries.json", "!../generated/outlines.json"]);
export async function loadCircuit(circuitId: string) {
  const loader = circuitRegistry.some(c => c.circuitId === circuitId)
    ? loaders[`../generated/${circuitId}.json`] : undefined;
  if (!loader) throw new Error(`Unknown circuit: ${circuitId}`);
  const data = (await loader()).default;
  if (data.circuitId !== circuitId || !data.trackGeometry.coordinates.length)
    throw new Error("Invalid circuit data package");
  return data;
}
