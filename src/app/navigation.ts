export type ViewMode = "overview" | "select" | "eye" | "phone";
export type AppRoute =
  | { level: "catalog" }
  | { level: "atlas"; venueId: string }
  | { level: "circuit"; circuitId: string; zoneId: string; mode: ViewMode }
  | { level: "not-found" };
export function parseRoute(hash: string): AppRoute {
  const path = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (path.length === 0 || (path[0] === "circuits" && path.length === 1))
    return { level: "catalog" };
  if(path.length===2&&path[0]==='atlas')return {level:'atlas',venueId:path[1]};
  if (path[0] !== "circuits" || !path[1]) return { level: "not-found" };
  const circuitId = path[1];
  if (path.length === 3 && path[2] === "map")
    return { level: "circuit", circuitId, zoneId: "a", mode: "overview" };
  if (
    path.length === 5 &&
    path[2] === "zones" &&
    ["select", "eye", "phone"].includes(path[4])
  )
    return {
      level: "circuit",
      circuitId,
      zoneId: path[3],
      mode: path[4] as ViewMode,
    };
  return { level: "not-found" };
}
export function circuitPath(
  circuitId: string,
  mode: ViewMode = "overview",
  zoneId = "a",
) {
  return mode === "overview"
    ? `#/circuits/${encodeURIComponent(circuitId)}/map`
    : `#/circuits/${encodeURIComponent(circuitId)}/zones/${encodeURIComponent(zoneId)}/${mode}`;
}
export function navigate(hash: string, replace = false) {
  if (typeof window === "undefined" || location.hash === hash) return;
  if (replace) {
    history.replaceState(null, "", hash);
    dispatchEvent(new HashChangeEvent("hashchange"));
  } else location.hash = hash;
}
