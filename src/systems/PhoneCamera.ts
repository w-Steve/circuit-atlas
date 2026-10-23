export const phoneSensor = {
  diagonal: Math.hypot(36, 24),
  aspect: 4 / 3,
  baseFocal: 24,
};
export function focalToFov(focal: number, aspect = 4 / 3) {
  if (focal <= 0 || aspect <= 0) throw Error("Invalid camera parameters");
  const height = phoneSensor.diagonal / Math.sqrt(1 + aspect * aspect);
  return (2 * Math.atan(height / (2 * focal)) * 180) / Math.PI;
}
export function zoomToFov(zoom: number) {
  return focalToFov(phoneSensor.baseFocal * zoom);
}
