/** Keep the original horizontal view on narrow screens while filling the container. */
export function getGameCameraFov(aspect: number) {
  const referenceAspect = 16 / 9;
  const verticalFov = 50;
  const safeAspect = Math.max(0.1, aspect);
  if (safeAspect >= referenceAspect) return verticalFov;
  const halfVertical = verticalFov * Math.PI / 360;
  return Math.min(170, Math.atan(Math.tan(halfVertical) * referenceAspect / safeAspect) * 360 / Math.PI);
}
