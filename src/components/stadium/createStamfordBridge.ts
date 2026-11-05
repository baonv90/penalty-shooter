import * as THREE from "three";
import { getStadiumLayout } from "./stadiumLayout";

/** Four enclosed stand buildings, rather than exposed terrace blocks. */
const layout = () => getStadiumLayout("stamford-bridge");
const standHeight = (side: number) => [24, 26, 22, 21][side];

function createArchitectureBatch() {
  const group = new THREE.Group();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const batches = new Map<THREE.Material, THREE.Matrix4[]>();
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  const put = (material: THREE.Material) => {
    dummy.updateMatrix();
    const matrices = batches.get(material) ?? [];
    matrices.push(dummy.matrix.clone());
    batches.set(material, matrices);
  };
  const block = (material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, rotation = 0) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rotation, 0);
    dummy.scale.set(w, h, d);
    put(material);
  };
  const beam = (material: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, thickness: number) => {
    direction.subVectors(b, a);
    dummy.position.addVectors(a, b).multiplyScalar(0.5);
    dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    dummy.scale.set(thickness, direction.length(), thickness);
    put(material);
  };
  const finish = () => {
    for (const [material, matrices] of batches) {
      const instances = new THREE.InstancedMesh(box, material, matrices.length);
      instances.name = material.name;
      matrices.forEach((matrix, index) => instances.setMatrixAt(index, matrix));
      group.add(instances);
    }
    return group;
  };
  return { group, block, beam, finish };
}

/** Chamfered corners follow the compact footprint in the reference photograph. */
function perimeter(x: number, z: number, corner: number) {
  return [
    [-x + corner, -z], [x - corner, -z], [x, -z + corner], [x, z - corner],
    [x - corner, z], [-x + corner, z], [-x, z - corner], [-x, -z + corner],
  ];
}

export function createStamfordBridgeBowl() {
  const { group, block, finish } = createArchitectureBatch();
  group.name = "stamford-bridge-enclosed-stands";
  const concrete = new THREE.MeshStandardMaterial({ color: 0xc3c5c1, roughness: 0.95 });
  concrete.name = "enclosed-stand-facades";
  const stone = new THREE.MeshStandardMaterial({ color: 0x7e858a, roughness: 0.95 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x234d86, roughness: 0.8 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x304554, roughness: 0.45, metalness: 0.25 });
  const brick = new THREE.MeshStandardMaterial({ color: 0x887b70, roughness: 1 });
  const white = new THREE.MeshStandardMaterial({ color: 0xedece1, roughness: 0.9 });
  const { roofOuterX: outerX, roofOuterZ: outerZ } = layout();

  for (let side = 0; side < 4; side++) {
    const transverse = side >= 2;
    const sign = side % 2 ? 1 : -1;
    const height = standHeight(side);
    const length = (transverse ? outerX : outerZ) * 2 - 12;
    const facade = (material: THREE.Material, along: number, y: number, span: number, h: number, thickness: number, inset = 0) => {
      if (transverse) block(material, along, y, 18 + sign * (outerZ - inset), span, h, thickness);
      else block(material, sign * (outerX - inset), y, 18 + along, thickness, h, span);
    };
    // Deep masonry shells close every exposed side of the two seating levels.
    facade(concrete, 0, height / 2, length, height, 1.4);
    facade(brick, 0, 1.65, length + 0.1, 3.3, 1.5);
    facade(blue, 0, 4, length + 0.2, 0.9, 1.55);
    facade(glass, 0, 7, length + 0.1, 1.9, 1.5);
    facade(stone, 0, 9, length + 0.2, 0.55, 1.7);
    facade(glass, 0, 13, length + 0.1, 2.5, 1.5);
    facade(blue, 0, height - 1.25, length + 0.3, 2.2, 1.6);
    for (let along = -length / 2 + 3; along < length / 2; along += 7) {
      facade(concrete, along, 11, 0.8, 15, 1.7);
      facade(stone, along, 2, 2.6, 3.7, 1.6);
      facade(glass, along, 2, 2, 3.4, 1.7);
    }
    for (const along of [-14, 14]) {
      facade(glass, along, 1.6, 5, 3.2, 1.85);
      if (transverse) block(blue, along, 3.5, 18 + sign * (outerZ + 1.5), 6, 0.35, 4);
      else block(blue, sign * (outerX + 1.5), 3.5, 18 + along, 4, 0.35, 6);
    }
    // Solid backs above the seating banks support the cantilevered roof.
    facade(blue, 0, 19.4, length - 1, 2.2, 0.35, 3.8);
  }
  // Full-height diagonal corner wings join the stand buildings into one enclosure.
  for (const xSide of [-1, 1]) {
    for (const zSide of [-1, 1]) {
      const height = Math.min(standHeight(xSide < 0 ? 0 : 1), standHeight(zSide < 0 ? 2 : 3));
      const angle = xSide * zSide * Math.PI / 4;
      block(concrete, xSide * (outerX - 3), height / 2, 18 + zSide * (outerZ - 3), 8.5, height, 1.5, angle);
      block(blue, xSide * (outerX - 3), height - 1.25, 18 + zSide * (outerZ - 3), 8.6, 2.2, 1.6, angle);
      block(stone, xSide * (outerX - 3), 9, 18 + zSide * (outerZ - 3), 8.6, 0.5, 1.6, angle);
    }
  }

  // Smooth sloping seating decks have no exposed staircase profile at the ends.
  const positions: number[] = [];
  const colors: number[] = [];
  const color = new THREE.Color();
  const { levels, rowsPerLevel, rowDepth, rowRise, floorRise } = layout();
  for (let level = 0; level < levels; level++) {
    for (let row = 0; row < rowsPerLevel; row++) {
      const near = row * rowDepth - rowDepth / 2;
      const far = near + rowDepth;
      const inner = perimeter(23 + near, 28 + near, 4);
      const outer = perimeter(23 + far, 28 + far, 4);
      const y = level * floorRise + 1.6 + row * rowRise;
      color.setHex(row % 2 ? 0x245594 : 0x20487f);
      for (let edge = 0; edge < 8; edge++) {
        const next = (edge + 1) % 8;
        const points = [
          [inner[edge][0], y - rowRise / 2, 18 + inner[edge][1]],
          [outer[edge][0], y + rowRise / 2, 18 + outer[edge][1]],
          [inner[next][0], y - rowRise / 2, 18 + inner[next][1]],
          [outer[next][0], y + rowRise / 2, 18 + outer[next][1]],
        ];
        for (const index of [0, 2, 1, 2, 3, 1]) {
          positions.push(...points[index]); colors.push(color.r, color.g, color.b);
        }
      }
    }
    // The level divider is a continuous balcony, supported by the outer building.
    if (level > 0) {
      for (const side of [-1, 1]) {
        block(white, side * 22, level * floorRise + 0.4, 18, 0.4, 0.8, 48);
        block(white, 0, level * floorRise + 0.4, 18 + side * 27, 36, 0.8, 0.4);
      }
    }
  }
  const seatingGeometry = new THREE.BufferGeometry();
  seatingGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  seatingGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  seatingGeometry.computeVertexNormals();
  const seating = new THREE.Mesh(seatingGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }));
  seating.name = "continuous-seating-decks";
  group.add(seating);

  // White seat lettering, built as geometry so previews need no canvas font texture.
  const letters: Record<string, string[]> = {
    C: ["01111", "11000", "10000", "10000", "10000", "11000", "01111"],
    H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  };
  for (const [letterIndex, letter] of [..."CHELSEA"].entries()) {
    letters[letter].forEach((line, row) => [...line].forEach((pixel, column) => {
      if (pixel === "1") block(white, -13.1 + (letterIndex * 6 + column) * 0.64,
        floorRise + 7.98 - row * 0.234, -24 + row * 0.52, 0.55, 0.12, 0.44);
    }));
  }
  return finish();
}

export function createStamfordBridgeRoof() {
  const { group, block, beam, finish } = createArchitectureBatch();
  group.name = "stamford-bridge-roof";
  const panels = new THREE.MeshStandardMaterial({ color: 0xa9ada8, roughness: 0.9, side: THREE.DoubleSide });
  panels.name = "four-cantilever-canopies";
  const steel = new THREE.MeshStandardMaterial({ color: 0xc4cbca, metalness: 0.45, roughness: 0.55 });
  steel.name = "roof-lattice-trusses";
  const blue = new THREE.MeshStandardMaterial({ color: 0x234e89, roughness: 0.8 });
  const glazing = new THREE.MeshStandardMaterial({ color: 0xc1d2d1, metalness: 0.2, roughness: 0.4 });
  const light = new THREE.MeshStandardMaterial({ color: 0xf5f0d7, emissive: 0xffedba, emissiveIntensity: 0.4 });
  const { roofOuterX, roofOuterZ, roofInnerX, roofInnerZ } = layout();
  for (let side = 0; side < 4; side++) {
    const transverse = side >= 2;
    const sign = side % 2 ? 1 : -1;
    const outer = transverse ? roofOuterZ : roofOuterX;
    const inner = transverse ? roofInnerZ : roofInnerX;
    const length = (transverse ? roofInnerX : roofOuterZ) * 2;
    const height = standHeight(side);
    const point = (along: number, across: number, rise = 0) => transverse
      ? new THREE.Vector3(along, height + rise, 18 + sign * across)
      : new THREE.Vector3(sign * across, height + rise, 18 + along);
    const panelCount = Math.ceil(length / 5);
    const panelLength = length / panelCount;
    for (let panel = 0; panel < panelCount; panel++) {
      const along = -length / 2 + (panel + 0.5) * panelLength;
      const middle = point(along, (inner + outer) / 2);
      block(panels, middle.x, height, middle.z,
        transverse ? panelLength - 0.06 : outer - inner, 0.3,
        transverse ? outer - inner : panelLength - 0.06);
      const window = point(along, inner + 2);
      block(glazing, window.x, height + 0.17, window.z, transverse ? panelLength - 0.15 : 2.2, 0.06, transverse ? 2.2 : panelLength - 0.15);
    }
    // Triangulated steel sits above the roof and anchors into the enclosed stands.
    const bays = Math.ceil(length / 8);
    for (let bay = 0; bay <= bays; bay++) {
      const along = -length / 2 + bay / bays * length;
      const rear = point(along, outer - 1, 1.8);
      const front = point(along, inner, 0.65);
      beam(steel, rear, front, 0.25);
      beam(steel, point(along, outer - 1, 0.2), front, 0.18);
      for (let section = 0; section < 4; section++) {
        const a = inner + (outer - inner - 1) * section / 4;
        const b = inner + (outer - inner - 1) * (section + 1) / 4;
        beam(steel, point(along, a, section % 2 ? 0.25 : 1.8), point(along, b, section % 2 ? 1.8 : 0.25), 0.13);
      }
      if (bay < bays) {
        const next = -length / 2 + (bay + 1) / bays * length;
        beam(steel, rear, point(next, outer - 1, 1.8), 0.22);
        beam(steel, front, point(next, inner, 0.65), 0.22);
        beam(steel, rear, point(next, inner, 0.65), 0.13);
        beam(steel, front, point(next, outer - 1, 1.8), 0.13);
        const lamp = point((along + next) / 2, inner + 0.3, -0.25);
        block(light, lamp.x, lamp.y, lamp.z, transverse ? 1.8 : 0.55, 0.3, transverse ? 0.55 : 1.8);
      }
    }
    const rearMiddle = point(0, outer);
    const frontMiddle = point(0, inner);
    block(blue, rearMiddle.x, height - 0.4, rearMiddle.z, transverse ? length : 0.5, 1, transverse ? 0.5 : length);
    block(blue, frontMiddle.x, height - 0.4, frontMiddle.z, transverse ? length : 0.4, 0.9, transverse ? 0.4 : length);
  }
  return finish();
}
