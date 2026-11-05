import * as THREE from "three";
import { StadiumId } from "../../constants/stadiums";
import { createLandmarkRoof } from "./createLandmarkRoof";

/** Segmented canopies, radial steel trusses and rear columns in three draw calls. */
export function createStadiumRoof(stadiumId: StadiumId = "arena") {
  if (stadiumId !== "arena") return createLandmarkRoof(stadiumId);
  const group = new THREE.Group();
  const panels: THREE.Matrix4[] = [];
  const steel: THREE.Matrix4[] = [];
  const glass: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  const direction = new THREE.Vector3();
  const middle = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const beam = (a: THREE.Vector3, b: THREE.Vector3, thickness: number) => {
    direction.subVectors(b, a);
    middle.addVectors(a, b).multiplyScalar(0.5);
    dummy.position.copy(middle);
    dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    dummy.scale.set(thickness, direction.length(), thickness);
    dummy.updateMatrix();
    steel.push(dummy.matrix.clone());
  };
  for (let side = 0; side < 4; side++) {
    const horizontal = side >= 2;
    const length = horizontal ? 72 : 70;
    const span = horizontal ? 12 : 14;
    const outer = horizontal ? (side === 2 ? -26 : 62) : (side === 0 ? -37 : 37);
    const inward = side === 0 || side === 2 ? 1 : -1;
    const point = (along: number, across: number, lower = false) => {
      const height = 10.5 + Math.sin(across / span * Math.PI) * 1.1 - across * 0.04 - (lower ? 0.65 : 0);
      return horizontal ? new THREE.Vector3(along, height, outer + inward * across)
        : new THREE.Vector3(outer + inward * across, height, 18 + along);
    };
    for (let segment = 0; segment < 6; segment++) {
      const a = point(0, segment * span / 6);
      const b = point(0, (segment + 1) * span / 6);
      dummy.position.addVectors(a, b).multiplyScalar(0.5);
      dummy.rotation.set(horizontal ? Math.atan2(b.y - a.y, b.z - a.z) : 0,
        0, horizontal ? 0 : Math.atan2(b.y - a.y, b.x - a.x));
      // Local x follows the roof slope; rotate the transverse canopy into the same convention.
      if (horizontal) {
        dummy.rotation.set(-Math.atan2(b.y - a.y, Math.abs(b.z - a.z)) * inward, 0, 0);
        dummy.scale.set(length, 0.12, span / 6 + 0.04);
      } else {
        dummy.scale.set(span / 6 + 0.04, 0.12, length);
      }
      dummy.updateMatrix();
      (segment === 5 ? glass : panels).push(dummy.matrix.clone());
    }
    for (let along = -length / 2; along <= length / 2; along += 8) {
      const rear = point(along, 0, true);
      const base = rear.clone(); base.y = 0;
      beam(base, rear, 0.22);
      for (let segment = 0; segment < 6; segment++) {
        const d1 = segment * span / 6;
        const d2 = (segment + 1) * span / 6;
        const topA = point(along, d1), topB = point(along, d2);
        const lowA = point(along, d1, true), lowB = point(along, d2, true);
        beam(topA, topB, 0.11);
        beam(lowA, lowB, 0.1);
        beam(segment % 2 ? lowA : topA, segment % 2 ? topB : lowB, 0.075);
      }
    }
    beam(point(-length / 2, span), point(length / 2, span), 0.2);
  }
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  for (const [matrices, material] of [
    [panels, new THREE.MeshStandardMaterial({ color: 0xc4cdd3, metalness: 0.35, roughness: 0.65 })],
    [steel, new THREE.MeshStandardMaterial({ color: 0x647480, metalness: 0.5, roughness: 0.55 })],
    [glass, new THREE.MeshStandardMaterial({ color: 0xb0d1dc, metalness: 0.15, roughness: 0.35 })],
  ] as const) {
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    group.add(mesh);
  }
  return group;
}
