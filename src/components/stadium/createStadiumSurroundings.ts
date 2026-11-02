import * as THREE from "three";
import { createStadiumRoads } from "./stadiumRoads";
import { createStadiumLandscape } from "./createStadiumLandscape";

/** Static stadium exterior: shared geometry/materials and instanced scenery. */
export function createStadiumSurroundings(homeColor: number, awayColor: number) {
  const group = new THREE.Group();
  group.name = "stadium-surroundings";
  const concrete = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 1 });
  const roof = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.8 });
  const white = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const batches = new Map<THREE.Material, THREE.Mesh[]>();
  const block = (x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(box, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    const batch = batches.get(material) ?? [];
    batch.push(mesh);
    batches.set(material, batch);
  };

  // The existing animated north stand sits behind the penalty goal at z = -10.
  // Complete the bowl around a 32 x 44 m pitch, with an open playing area.
  for (let tier = 0; tier < 6; tier++) {
    const height = 1.6 + tier * 1.2;
    const sideX = 23 + tier * 2.2;
    block(-sideX, height / 2, 18, 2.2, height, 66, concrete);
    block(sideX, height / 2, 18, 2.2, height, 66, concrete);
    block(0, height / 2, 48 + tier * 2.2, 68, height, 2.2, concrete);
  }
  block(-30, 10, 18, 14, 0.5, 70, roof);
  block(30, 10, 18, 14, 0.5, 70, roof);
  block(0, 10, -20, 72, 0.5, 12, roof);
  block(0, 10, 56, 72, 0.5, 12, roof);

  // Static seats are batched into one draw call, separate from the animated crowd.
  const rows = 6;
  const seatsPerRow = 50;
  const seats = new THREE.InstancedMesh(box,
    new THREE.MeshStandardMaterial({ roughness: 0.9 }), rows * seatsPerRow * 3);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let index = 0;
  for (let side = 0; side < 3; side++) {
    for (let row = 0; row < rows; row++) {
      for (let seat = 0; seat < seatsPerRow; seat++) {
        const along = -26 + seat * 1.06;
        dummy.position.set(side === 0 ? -23 - row * 2.2 : side === 1 ? 23 + row * 2.2 : along,
          2 + row * 1.2, side === 2 ? 48 + row * 2.2 : 18 + along);
        dummy.scale.set(0.65, 0.45, 0.65);
        dummy.updateMatrix();
        seats.setMatrixAt(index, dummy.matrix);
        seats.setColorAt(index++, color.setHex((seat + row) % 5 < 3 ? homeColor : awayColor));
      }
    }
  }
  group.add(seats);

  // Only the opposite goal belongs to the exterior; markings are owned by pitch.ts.
  block(-3.66, 1.22, 40, 0.16, 2.44, 0.16, white);
  block(3.66, 1.22, 40, 0.16, 2.44, 0.16, white);
  block(0, 2.44, 40, 7.48, 0.16, 0.16, white);

  // Concourse, approach roads and a small low-poly neighborhood outside the bowl.
  const paving = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 1 });
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 1 });
  const ground = new THREE.MeshStandardMaterial({ color: 0x65885c, roughness: 1 });
  block(0, -0.15, 18, 1000, 0.1, 1000, ground);
  block(-43, 0.01, 18, 10, 0.02, 100, paving);
  block(43, 0.01, 18, 10, 0.02, 100, paving);
  block(0, 0.01, 68, 96, 0.02, 10, paving);
  block(0, 0.01, -33, 96, 0.02, 10, paving);
  group.add(createStadiumRoads());

  // Entrance portals, ticket booths and parking pads along the approach paths.
  const entrance = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1 });
  for (const side of [-1, 1]) {
    for (const z of [0, 36]) {
      block(side * 36, 1.6, z, 0.3, 3.2, 4, entrance);
      block(side * 36, 3.4, z, 0.7, 0.35, 5, white);
      block(side * 41, 1, z + 5, 2, 2, 2, concrete);
      block(side * 41, 2.1, z + 5, 2.5, 0.25, 2.5, roof);
    }
    block(side * 64, 0.015, 30, 12, 0.02, 36, asphalt);
    for (let i = 0; i < 8; i++) block(side * 64, 0.04, 14 + i * 4.5, 10, 0.03, 0.12, white);
  }

  group.add(createStadiumLandscape());
  for (const x of [-37, 37]) {
    for (const z of [-24, 61]) {
      block(x, 10, z, 0.45, 20, 0.45, concrete);
      block(x, 20, z, 5, 2, 0.7, white);
    }
  }
  // Batch architecture by material instead of adding a draw call for every block.
  for (const [material, blocks] of batches) {
    const instances = new THREE.InstancedMesh(box, material, blocks.length);
    blocks.forEach((mesh, i) => {
      mesh.updateMatrix();
      instances.setMatrixAt(i, mesh.matrix);
    });
    group.add(instances);
  }
  group.traverse((object) => {
    object.updateMatrix();
    object.matrixAutoUpdate = false;
  });
  return group;
}
