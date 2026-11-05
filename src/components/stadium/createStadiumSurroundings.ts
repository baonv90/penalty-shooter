import * as THREE from "three";
import { createStadiumRoof } from "./createStadiumRoof";
import { createStadiumRoads } from "./stadiumRoads";
import { createStadiumLandscape } from "./createStadiumLandscape";
import { getStadium, StadiumId } from "../../constants/stadiums";
import { getStadiumLayout, getStadiumRows } from "./stadiumLayout";
import { createSanSiroBowl } from "./createSanSiroBowl";
import { createStadiumPlaza } from "./createStadiumPlaza";
import { createStamfordBridgeBowl } from "./createStamfordBridge";

/** Static stadium exterior: shared geometry/materials and instanced scenery. */
export function createStadiumSurroundings(homeColor: number, awayColor: number, stadiumId: StadiumId = "arena") {
  const stadium = getStadium(stadiumId);
  const layout = getStadiumLayout(stadiumId);
  const standRows = getStadiumRows(stadiumId);
  const milan = stadiumId === "san-siro";
  const london = stadiumId === "stamford-bridge";
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
  if (milan) group.add(createSanSiroBowl());
  if (london) group.add(createStamfordBridgeBowl());
  for (const row of milan || london ? [] : standRows) {
    const height = row.height - row.base;
    const sideX = 23 + row.offset;
    block(-sideX, row.base + height / 2, 18, row.depth, height, 56, concrete);
    block(sideX, row.base + height / 2, 18, row.depth, height, 56, concrete);
    block(0, row.base + height / 2, 48 + row.offset, 44, height, row.depth, concrete);
  }
  // Continuous balcony fronts and dark concourses make the floors readable.
  const tierTrim = new THREE.MeshStandardMaterial({ color: stadiumId === "san-siro" ? 0xaeb3b5 : 0xe0e6e9, roughness: 0.9 });
  const concourse = new THREE.MeshStandardMaterial({ color: 0x172c3b, roughness: 1 });
  for (let level = 1; !milan && !london && level < layout.levels; level++) {
    const offset = level * (layout.rowsPerLevel * layout.rowDepth + 1) - 0.7;
    const y = level * layout.floorRise;
    for (const side of [-1, 1]) {
      block(side * (23 + offset), y - 0.2, 18, 1.2, 0.6, 58, tierTrim);
      block(0, y - 0.2, 18 + side * (28 + offset), 46 + offset * 2, 0.6, 1.2, tierTrim);
      block(side * (23 + offset), y - 1.25, 18, 0.3, 1.5, 56, concourse);
      block(0, y - 1.25, 18 + side * (28 + offset), 44, 1.5, 0.3, concourse);
    }
  }
  group.add(createStadiumRoof(stadiumId));

  // Static seats are batched into one draw call, separate from the animated crowd.
  const rows = milan || london ? 0 : standRows.length;
  const seatsPerRow = 50;
  const seats = new THREE.InstancedMesh(box,
    new THREE.MeshStandardMaterial({ roughness: 0.9 }), rows * seatsPerRow * 3);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let index = 0;
  for (let side = 0; side < 3; side++) {
    for (let row = 0; row < rows; row++) {
      for (let seat = 0; seat < seatsPerRow; seat++) {
        const along = side === 2 ? -21 + seat * 0.86 : -26 + seat * 1.06;
        const terrace = standRows[row];
        dummy.position.set(side === 0 ? -23 - terrace.offset : side === 1 ? 23 + terrace.offset : along,
          terrace.height + 0.25, side === 2 ? 48 + terrace.offset : 18 + along);
        dummy.scale.set(0.65, 0.45, 0.65);
        dummy.updateMatrix();
        seats.setMatrixAt(index, dummy.matrix);
        seats.setColorAt(index++, color.setHex((seat + row) % 5 < 3 ? stadium.seatColor : stadium.awaySeatColor));
      }
    }
  }
  if (!milan && !london) group.add(seats);

  // Pitch-side barriers and team-colored boards reuse existing instanced batches.
  const boardColors = [homeColor, awayColor].map(color => new THREE.MeshBasicMaterial({ color }));
  for (const side of [-1, 1]) {
    for (let z = -2; z <= 42; z += 4) {
      block(side * 19, 0.55, z, 0.15, 1.1, 3.6, boardColors[Math.abs(z / 4) % 2 < 1 ? 0 : 1]);
    }
    block(side * 21, 1, 18, 0.1, 0.08, 54, roof);
    for (let z = -8; z <= 44; z += 4) block(side * 21, 0.5, z, 0.08, 1, 0.08, roof);
  }

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
  group.add(london ? createStadiumPlaza() : createStadiumRoads());

  // Entrance portals, ticket booths and parking pads along the approach paths.
  const entrance = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1 });
  for (const side of [-1, 1]) {
    for (const z of [0, 36]) {
      const gateX = milan || london ? 42.5 : 24 + standRows[standRows.length - 1].offset;
      block(side * gateX, 1.6, z, 0.3, 3.2, 4, entrance);
      block(side * gateX, 3.4, z, 0.7, 0.35, 5, white);
      const boothX = london ? 41 : 45;
      const boothZ = london ? z === 0 ? -29 : 65 : z + 5;
      block(side * boothX, 1, boothZ, 2, 2, 2, concrete);
      block(side * boothX, 2.1, boothZ, 2.5, 0.25, 2.5, roof);
    }
    if (!london) {
      block(side * 64, 0.015, 30, 12, 0.02, 36, asphalt);
      for (let i = 0; i < 8; i++) block(side * 64, 0.04, 14 + i * 4.5, 10, 0.03, 0.12, white);
    }
  }

  group.add(createStadiumLandscape(stadiumId));
  for (const x of london ? [] : [-37, 37]) {
    for (const z of [-24, 61]) {
      const lightHeight = Math.max(20, layout.roofHeight + 5);
      block(x, lightHeight / 2, z, 0.45, lightHeight, 0.45, concrete);
      block(x, lightHeight, z, 5, 2, 0.7, white);
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
