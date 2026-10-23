import type { CircuitSummary } from "../types";
import summaries from "../generated/summaries.json";
export const shanghaiSummary = summaries.find(c=>c.circuitId==='shanghai') as CircuitSummary;
