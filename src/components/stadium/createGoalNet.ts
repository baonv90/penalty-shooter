import * as THREE from "three";
import { GOAL } from "../../utils/shotSimulation";

/** Continuous rope grid: back, sides and roof meet at the same edges. */
export function createGoalNet() {
  const group = new THREE.Group();
  const vertices: number[] = [];
  const segment = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => vertices.push(ax, ay, az, bx, by, bz);
  const xs = Array.from({ length: 42 }, (_, i) => -GOAL.halfWidth + i / 41 * GOAL.halfWidth * 2);
  const ys = Array.from({ length: 15 }, (_, i) => i / 14 * GOAL.height);
  const zs = Array.from({ length: 10 }, (_, i) => -i / 9 * GOAL.depth);
  for (const x of xs) {
    segment(x, 0, -GOAL.depth, x, GOAL.height, -GOAL.depth);
    segment(x, GOAL.height, 0, x, GOAL.height, -GOAL.depth);
  }
  for (const y of ys) {
    segment(-GOAL.halfWidth, y, -GOAL.depth, GOAL.halfWidth, y, -GOAL.depth);
    for (const x of [-GOAL.halfWidth, GOAL.halfWidth]) segment(x, y, 0, x, y, -GOAL.depth);
  }
  for (const z of zs) {
    segment(-GOAL.halfWidth, GOAL.height, z, GOAL.halfWidth, GOAL.height, z);
    for (const x of [-GOAL.halfWidth, GOAL.halfWidth]) segment(x, 0, z, x, GOAL.height, z);
  }
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.Float32BufferAttribute(vertices, 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positions);
  const ropes = new THREE.LineSegments(geometry,
    new THREE.LineBasicMaterial({ color: 0xe9f1ed, transparent: true, opacity: 0.72, depthWrite: false }));
  // The small bulge must not invalidate the original culling bounds.
  geometry.computeBoundingSphere();
  geometry.boundingSphere!.radius += 0.2;
  group.add(ropes);
  let lastIntensity = -1;
  return { group, updateBulge(intensity: number) {
    const amount = THREE.MathUtils.clamp(intensity, 0, 1);
    if (Math.abs(amount - lastIntensity) < 0.001) return;
    lastIntensity = amount;
    for (let i = 0; i < positions.count; i++) {
      const restZ = vertices[i * 3 + 2];
      // Keep the front opening attached to the frame while stretching the back.
      positions.setZ(i, restZ - amount * 0.12 * (-restZ / GOAL.depth));
    }
    positions.needsUpdate = true;
  } };
}
