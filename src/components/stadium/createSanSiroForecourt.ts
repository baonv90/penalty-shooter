import * as THREE from "three";
import { createSanSiroBatch } from "./sanSiroGeometry";

/** The circular entrance shelters that ring the stadium in the reference images. */
export function createSanSiroForecourt() {
  const { group, block, beam, finish } = createSanSiroBatch();
  group.name = "san-siro-circular-entrances";
  const paving = new THREE.MeshStandardMaterial({ color: 0x858782, roughness: 1 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8e9c9a, roughness: 0.65, metalness: 0.35 });
  const canopy = new THREE.MeshStandardMaterial({ color: 0xd3d0be, roughness: 0.85 });
  const underside = new THREE.MeshStandardMaterial({ color: 0xa59876, emissive: 0x9e8548, emissiveIntensity: 0.12, roughness: 1 });
  const positions: Array<[number, number]> = [];
  for (const side of [-1, 1]) {
    block(paving, side * 71, 0.025, 18, 24, 0.04, 132);
    block(paving, 0, 0.025, 18 + side * 81, 166, 0.04, 22);
    for (let i = 0; i < 5; i++) {
      positions.push([side * 73, -22 + i * 20]);
      positions.push([-44 + i * 22, 18 + side * 81]);
    }
  }
  const roofs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.98, 1, 0.22, 40), canopy, positions.length);
  roofs.name = "circular-entry-canopies";
  const ceilings = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.08, 40), underside, positions.length);
  const dummy = new THREE.Object3D();
  positions.forEach(([x, z], index) => {
    dummy.position.set(x, 4.5, z);
    dummy.scale.set(5.7, 1, 5.7);
    dummy.updateMatrix(); roofs.setMatrixAt(index, dummy.matrix);
    dummy.position.y = 4.32;
    dummy.scale.set(5.45, 1, 5.45);
    dummy.updateMatrix(); ceilings.setMatrixAt(index, dummy.matrix);
    for (let post = 0; post < 6; post++) {
      const a = post / 6 * Math.PI * 2;
      const b = (post + 1) / 6 * Math.PI * 2;
      const px = x + Math.cos(a) * 4;
      const pz = z + Math.sin(a) * 4;
      block(steel, px, 2.15, pz, 0.16, 4.3, 0.16);
      beam(steel, new THREE.Vector3(px, 0.1, pz), new THREE.Vector3(x + Math.cos(b) * 4, 4.25, z + Math.sin(b) * 4), 0.08);
    }
  });
  group.add(roofs, ceilings);
  return finish();
}
