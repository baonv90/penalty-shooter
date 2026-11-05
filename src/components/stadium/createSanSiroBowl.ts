import * as THREE from "three";
import { getStadiumRows } from "./stadiumLayout";

/** Three aligned rectangular floors, with continuous corner seating and a solid exterior. */
export function createSanSiroBowl() {
  const group = new THREE.Group();
  group.name = "san-siro-rectangular-bowl";
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9b9fa1, roughness: 1 });
  const seats = new THREE.MeshStandardMaterial({ color: 0xbc4b3f, roughness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x344655, roughness: 0.55 });
  const red = new THREE.MeshStandardMaterial({ color: 0xa93932, roughness: 0.9 });
  const batches = new Map<THREE.Material, THREE.Matrix4[]>();
  const dummy = new THREE.Object3D();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const block = (material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    const matrices = batches.get(material) ?? [];
    matrices.push(dummy.matrix.clone());
    batches.set(material, matrices);
  };
  const ring = (material: THREE.Material, outerX: number, outerZ: number, depth: number, y: number, height: number) => {
    // Side walls run to the outer corners; end walls meet them without gaps.
    for (const side of [-1, 1]) {
      block(material, side * (outerX - depth / 2), y, 18, depth, height, outerZ * 2);
      block(material, 0, y, 18 + side * (outerZ - depth / 2), (outerX - depth) * 2, height, depth);
    }
  };
  for (const row of getStadiumRows("san-siro")) {
    const outerX = 23 + row.offset + row.depth / 2;
    const outerZ = 28 + row.offset + row.depth / 2;
    const height = row.height - row.base;
    ring(concrete, outerX, outerZ, row.depth, row.base + height / 2, height);
    ring(seats, outerX - 0.12, outerZ - 0.12, row.depth - 0.24, row.height + 0.06, 0.12);
  }
  for (let level = 0; level < 3; level++) {
    const base = level * 8;
    // Identical footprints on every floor make the exterior one complete volume.
    ring(concrete, 42, 48, 0.65, base + 3.3, 6.6);
    ring(glass, 42.02, 48.02, 0.7, base + 7.1, 1);
    ring(concrete, 42.1, 48.1, 0.9, base + 7.85, 0.5);
    ring(red, 42.13, 48.13, 0.12, base + 7.65, 0.12);
    // Balcony lips border a single rectangular opening at each level.
    if (level > 0) ring(concrete, 23, 28, 0.35, base + 0.35, 0.7);
    for (const side of [-1, 1]) {
      for (let z = -26; z <= 62; z += 8) block(concrete, side * 42.05, base + 7.1, z, 0.8, 1.5, 0.5);
      for (let x = -32; x <= 32; x += 8) block(concrete, x, base + 7.1, 18 + side * 48.05, 0.5, 1.5, 0.8);
    }
  }
  for (const [material, matrices] of batches) {
    const instances = new THREE.InstancedMesh(box, material, matrices.length);
    instances.name = material === concrete ? "continuous-rectangular-floors" : "san-siro-bowl-detail";
    matrices.forEach((matrix, index) => instances.setMatrixAt(index, matrix));
    group.add(instances);
  }
  return group;
}
