import { StadiumId } from "../constants/stadiums";

export const getGameCameraPosition = (stadiumId: StadiumId = "arena"): [number, number, number] =>
  stadiumId === "home-ground" ? [0, 3.6, 9.5] : [0, 3.5, 9];

/** Keep the venue's horizontal view on narrow screens while filling the container. */
export function getGameCameraFov(aspect: number, stadiumId: StadiumId = "arena") {
  const referenceAspect = 16 / 9;
  const verticalFov = stadiumId === "home-ground" ? 52 : 50;
  const safeAspect = Math.max(0.1, aspect);
  if (safeAspect >= referenceAspect) return verticalFov;
  const halfVertical = verticalFov * Math.PI / 360;
  return Math.min(170, Math.atan(Math.tan(halfVertical) * referenceAspect / safeAspect) * 360 / Math.PI);
}
