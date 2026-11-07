import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { facilities as f, local } from "../data/config";
import type { Selection } from "../store";
import { zonePoint, zoneById, nearestTrack } from "../circuits/shanghai/spectators";
export function tierData(tier: Selection["tier"]) {
  const a = f.stand;
  return tier === "lower"
    ? {
        offset: a.frontOffset,
        depth: a.lowerDepth,
        base: a.lowerBase,
        rise: a.lowerRise,
      }
    : {
        offset: a.upperOffset,
        depth: a.upperDepth,
        base: a.upperBase,
        rise: a.upperRise,
      };
}
export function validSelection(s: Selection) {
  return (
    ["lower", "upper", "platinum"].includes(s.tier) &&
    !!zoneById(s.zoneId??'a') &&
    ((!s.zoneId||s.zoneId==='a')||s.tier==='lower') &&
    Number.isFinite(s.u) &&
    Number.isFinite(s.v) &&
    s.u >= 0 &&
    s.u <= 1 &&
    s.v >= 0 &&
    s.v <= 1
  );
}
export function observer(s: Selection) {
  if (!validSelection(s)) throw Error("Invalid grandstand point");
  if(s.zoneId && s.zoneId!=='a')return zonePoint(s.zoneId,s.u,s.v);
  const t = tierData(s.tier);
  const u=s.tier==='platinum'?.35+s.u*.3:s.u;
  const v=s.tier==='platinum'?.32+s.v*.36:s.v;
  return new Vector3(
    ...local(
      (u - 0.5) * f.stand.length,
      t.base + v * t.rise + f.stand.eyeHeight,
      t.offset + v * t.depth,
    ),
  );
}
export function lookTarget(s:Selection){
  if(!s.zoneId||s.zoneId==='a'){
    const u=s.tier==='platinum'?.35+s.u*.3:s.u;
    return new Vector3(...local((u-.5)*f.stand.length,4,0));
  }
  return nearestTrack(observer(s)).point.add(new Vector3(0,.9,0));
}
export function standGeometry(tier: Selection["tier"]) {
  const t = tierData(tier);
  const vertices = [];
  for (const [u, v] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ])
    vertices.push(
      ...local(
        (u - 0.5) * f.stand.length,
        t.base + v * t.rise,
        t.offset + v * t.depth,
      ),
    );
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  g.computeVertexNormals();
  return g;
}
