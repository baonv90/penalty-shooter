/** Start outside the best-quality zone so immediate double clicks cannot guarantee it. */
export function randomizeShotQuality() {
  return {
    scaleValue: 1.95 + Math.random() * 1.05,
    direction: Math.random() < 0.5 ? -1 : 1,
  };
}
