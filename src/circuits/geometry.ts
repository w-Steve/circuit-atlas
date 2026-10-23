import {
  CatmullRomCurve3,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
} from "three";
import type { Elevation } from "./types";
import { terrainHeight } from "./elevation";
export function createCircuitGeometry(
  coords: readonly number[][],
  publishedLength: number,
  elevation?: Elevation,
) {
  if (
    coords.length < 4 ||
    !coords.every(
      (p) => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]),
    )
  )
    throw Error("Invalid circuit coordinates");
  if (!Number.isFinite(publishedLength) || publishedLength <= 0)
    throw Error("Invalid circuit length");
  const first = coords[0],
    last = coords[coords.length - 1];
  if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 1e-5)
    throw Error("Circuit is not closed");
  const origin = coords[0];
  const geoPoints = coords
    .slice(0, -1)
    .map(
      ([lon, lat]) =>
        new Vector3(
          (lon - origin[0]) * 111320 * Math.cos((origin[1] * Math.PI) / 180),
          0,
          -(lat - origin[1]) * 111320,
        ),
    );
  let track = new CatmullRomCurve3(geoPoints, true, "centripetal");
  track.arcLengthDivisions = 20000;
  const rawLength = track.getLength();
  if (rawLength < 1) throw Error("Degenerate circuit");
  const calibration = publishedLength / rawLength;
  geoPoints.forEach((p) => p.multiplyScalar(calibration));
  let horizontalCalibration = calibration;
  const bridgeLifts:{index:number;span:number;lift:number}[]=[];
  if (elevation?.grid) {
    geoPoints.forEach((p,i)=>{p.y=terrainHeight(elevation,coords[i][0],coords[i][1])});
    for(const bridge of elevation.overpasses??[]){
      const lift=Math.max(0,geoPoints[bridge.lowerIndex].y+bridge.separationMetres-geoPoints[bridge.upperIndex].y);
      bridgeLifts.push({index:bridge.upperIndex,span:bridge.halfSpan,lift});
      geoPoints.forEach((p,i)=>{const d=Math.abs(i-bridge.upperIndex);if(d<bridge.halfSpan)p.y+=lift*(1+Math.cos(Math.PI*d/bridge.halfSpan))/2});
    }
    // Preserve metres vertically; calibrate only horizontal geography to lap length.
    for(let i=0;i<6;i++){
      track.updateArcLengths();
      const ratio=publishedLength/track.getLength();
      geoPoints.forEach(p=>{p.x*=ratio;p.z*=ratio});
      horizontalCalibration*=ratio;
    }
  }
  if(elevation?.grid){
    // Sparse GIS vertices interpolate a different vertical spline than the DEM.
    // Sample the same geographic height along the road so cars cannot sink under
    // the terrain between source vertices. Bridge lift is added above that datum.
    const count=4000,sourceTrack=track;
    const points=Array.from({length:count},(_,i)=>{
      const u=i/count,p=sourceTrack.getPoint(u);
      const lon=origin[0]+p.x/(111320*Math.cos(origin[1]*Math.PI/180)*horizontalCalibration);
      const lat=origin[1]-p.z/(111320*horizontalCalibration);
      p.y=terrainHeight(elevation,lon,lat);
      for(const bridge of bridgeLifts){const delta=Math.abs(u*geoPoints.length-bridge.index);if(delta<bridge.span)p.y+=bridge.lift*(1+Math.cos(Math.PI*delta/bridge.span))/2}
      return p;
    });
    track=new CatmullRomCurve3(points,true,'centripetal');track.arcLengthDivisions=20000;
    for(let i=0;i<6;i++){
      track.updateArcLengths();const ratio=publishedLength/track.getLength();
      points.forEach(p=>{p.x*=ratio;p.z*=ratio});geoPoints.forEach(p=>{p.x*=ratio;p.z*=ratio});horizontalCalibration*=ratio;
    }
  }
  track.updateArcLengths();
  const length = track.getLength();
  const at = (s: number) =>
    track.getPointAt((((s % length) + length) % length) / length);
  const tangent = (s: number) =>
    track.getTangentAt((((s % length) + length) % length) / length);
  function ribbon(width: number, y = 0.03) {
    const points: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= 2400; i++) {
      const p = track.getPointAt(i / 2400),
        t = track.getTangentAt((i % 2400) / 2400),
        n = new Vector3(-t.z, 0, t.x).normalize();
      for (const side of [-1, 1]) {
        const q = p.clone().addScaledVector(n, (side * width) / 2);
        const surface = p.y;
        points.push(q.x, surface + y, q.z);
      }
      if (i < 2400) {
        const j = i * 2;
        indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(points, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }
  return {
    origin,
    geoPoints,
    track,
    rawLength,
    calibration: horizontalCalibration,
    length,
    at,
    tangent,
    ribbon,
  };
}
