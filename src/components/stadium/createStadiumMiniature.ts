import * as THREE from "three";
import { getStadium, StadiumId } from "../../constants/stadiums";
import { createStadiumRoof } from "./createStadiumRoof";
import { getStadiumLayout, getStadiumRows } from "./stadiumLayout";
import { createSanSiroBowl } from "./createSanSiroBowl";
import { createStamfordBridgeBowl } from "./createStamfordBridge";

/** Small, real 3D models for the selector; the roof is shared with the venue. */
export function createStadiumMiniature(id: StadiumId) {
  const stadium = getStadium(id);
  const layout = getStadiumLayout(id);
  const group = new THREE.Group();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const concrete = new THREE.MeshStandardMaterial({ color: 0x687785, roughness: 1 });
  const seats = new THREE.MeshStandardMaterial({ color: stadium.seatColor });
  const grass = new THREE.MeshStandardMaterial({ color: 0x448c68 });
  const base = new THREE.MeshStandardMaterial({ color: 0x233b48 });
  const white = new THREE.MeshBasicMaterial({ color: 0xe0ede6 });
  const block = (material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    const mesh = new THREE.Mesh(box, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    group.add(mesh);
  };
  block(base, 0, -1, 18, layout.roofOuterX * 2 + 12, 2, layout.roofOuterZ * 2 + 12);
  block(grass, 0, 0.1, 18, 40, 0.2, 62);
  for (const side of [-1, 1]) {
    for (const row of id !== "arena" ? [] : getStadiumRows(id)) {
      const height = row.height - row.base;
      block(concrete, side * (23 + row.offset), row.base + height / 2, 18, row.depth, height, 56);
      block(seats, side * (23 + row.offset), row.height + 0.15, 18, row.depth, 0.3, 55);
      block(concrete, 0, row.base + height / 2, 18 + side * (28 + row.offset), 44, height, row.depth);
      block(seats, 0, row.height + 0.15, 18 + side * (28 + row.offset), 43, 0.3, row.depth);
    }
    for (let level = 1; id === "arena" && level < layout.levels; level++) {
      const offset = level * (layout.rowsPerLevel * layout.rowDepth + 1) - 0.7;
      block(white, side * (23 + offset), level * layout.floorRise - 0.2, 18, 1, 0.5, 58);
      block(white, 0, level * layout.floorRise - 0.2, 18 + side * (28 + offset), 44, 0.5, 1);
    }
    block(white, side * 18, 0.24, 18, 0.25, 0.05, 56);
    block(white, 0, 0.24, 18 + side * 28, 36, 0.05, 0.25);
  }
  block(white, 0, 0.24, 18, 36, 0.05, 0.25);
  if (id === "san-siro") group.add(createSanSiroBowl());
  if (id === "stamford-bridge") group.add(createStamfordBridgeBowl());
  group.add(createStadiumRoof(id));
  group.position.z = -18;
  return group;
}
