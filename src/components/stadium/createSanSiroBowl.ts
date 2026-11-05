import * as THREE from "three";
import { getStadiumRows } from "./stadiumLayout";
import { createSanSiroRing, createSanSiroBatch } from "./sanSiroGeometry";

/** Three connected tiers behind San Siro's rounded, horizontally banded concrete shell. */
export function createSanSiroBowl() {
  const { group, block, finish } = createSanSiroBatch();
  group.name = "san-siro-rectangular-bowl";
  const concrete = new THREE.MeshStandardMaterial({ color: 0xbab7a9, roughness: 1 });
  const seats = new THREE.MeshStandardMaterial({ color: 0xbc4b3f, roughness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x383d3e, roughness: 0.65 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xc69a43, roughness: 0.9 });
  const shellGeometry = createSanSiroRing(42, 48, 8, 0.8);
  const shell = new THREE.Mesh(shellGeometry, concrete);
  shell.name = "rounded-concrete-shell";
  shell.position.set(0, 0, 18);
  shell.scale.y = 24;
  group.add(shell);
  const ring = (material: THREE.Material, outerX: number, outerZ: number, radius: number, depth: number, y: number, height: number) => {
    const mesh = new THREE.Mesh(createSanSiroRing(outerX, outerZ, radius, depth), material);
    mesh.position.set(0, y, 18);
    mesh.scale.y = height;
    group.add(mesh);
  };
  for (const row of getStadiumRows("san-siro")) {
    const outerX = 23 + row.offset + row.depth / 2;
    const outerZ = 28 + row.offset + row.depth / 2;
    const height = row.height - row.base;
    const radius = 4 + row.offset * 0.2;
    ring(concrete, outerX, outerZ, radius, row.depth, row.base, height);
    ring(row.level === 2 ? yellow : seats, outerX - 0.12, outerZ - 0.12, radius, row.depth - 0.24, row.height, 0.12);
  }
  // Closely spaced dark concourses and pale ribs wrap around every curved corner.
  const windows = new THREE.InstancedMesh(shellGeometry, glass, 13);
  windows.name = "continuous-horizontal-concourses";
  const dummy = new THREE.Object3D();
  for (let band = 0; band < 13; band++) {
    dummy.position.set(0, 2 + band * 1.65, 18);
    dummy.scale.set(1.002, 0.7, 1.002);
    dummy.updateMatrix();
    windows.setMatrixAt(band, dummy.matrix);
  }
  group.add(windows);
  for (let level = 0; level < 3; level++) {
    const base = level * 8;
    ring(concrete, 42.15, 48.15, 8, 1, base + 7.65, 0.6);
    if (level > 0) ring(concrete, 23, 28, 4, 0.35, base, 0.7);
    for (const side of [-1, 1]) {
      for (let z = -20; z <= 56; z += 7) block(concrete, side * 42.1, base + 4, z, 0.3, 8, 0.3);
      for (let x = -28; x <= 28; x += 7) block(concrete, x, base + 4, 18 + side * 48.1, 0.3, 8, 0.3);
    }
  }
  return finish();
}
