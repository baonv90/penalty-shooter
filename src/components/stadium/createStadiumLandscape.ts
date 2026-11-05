import * as THREE from "three";
import { StadiumId } from "../../constants/stadiums";

/** Static, instanced neighborhood and layered terrain; no frame-by-frame work. */
export function createStadiumLandscape(stadiumId: StadiumId = "arena") {
  const london = stadiumId === "stamford-bridge";
  const milan = stadiumId === "san-siro";
  const group = new THREE.Group();
  group.name = "neighborhood-and-hills";
  const box = new THREE.BoxGeometry(1, 1, 1);
  const batches = new Map<THREE.Material, THREE.Matrix4[]>();
  const dummy = new THREE.Object3D();
  const random = (seed: number) => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const material = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const facades = (london ? [0x9f5543, 0xbd795e, 0xd7c5a6, 0x825044] : [0xbca995, 0xd6cfc1, 0xa6b1b5, 0x9f8472]).map(material);
  const trim = material(0xe5dfd4);
  const glass = new THREE.MeshStandardMaterial({ color: 0x42637a, metalness: 0.3, roughness: 0.35 });
  const roofMat = material(0x59616a);
  const doors = material(0x273945);
  const pitchedRoofs: THREE.Matrix4[] = [];
  const addBox = (mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    const batch = batches.get(mat) ?? [];
    batch.push(dummy.matrix.clone());
    batches.set(mat, batch);
  };
  const buildingCount = london ? 120 : milan ? 100 : 28;
  for (let i = 0; i < buildingCount; i++) {
    const side = i < 14 ? -1 : 1;
    let x = side * (80 + random(i + 1) * 20);
    let z = -65 + i % 14 * 13 + random(i + 31) * 5;
    if (london || milan) {
      // Dense city blocks on all four sides, with clear roads and railway access.
      const ring = Math.floor(i / 40);
      const edge = Math.floor(i % 40 / 10);
      const along = (i % 10 - 4.5) * ((london ? 12.5 : 18) + ring * 3);
      if (edge < 2) {
        x = (edge === 0 ? -1 : 1) * ((london ? 61 : 90) + ring * 28);
        z = 18 + along;
        // The east station stays open to the pedestrian precinct.
        if (london && edge === 1 && ring === 0 && z > -32 && z < 48) x = 80;
      } else {
        x = along;
        z = 18 + (edge === 2 ? -1 : 1) * ((london ? 68 : 102) + ring * 26);
      }
      x += (random(i + 31) - 0.5) * 3;
      z += (random(i + 47) - 0.5) * 3;
    }
    const floors = (london ? 3 : 2) + Math.floor(random(i + 7) * (london ? 3 : 5));
    const h = floors * 2.7;
    const w = (london ? 9 : 7) + random(i + 13) * 6;
    const d = (london ? 9 : 7) + random(i + 21) * (london ? 5 : 4);
    addBox(facades[i % facades.length], x, h / 2, z, w, h, d);
    addBox(trim, x, 0.35, z, w + 0.25, 0.7, d + 0.25);
    addBox(trim, x, h + 0.1, z, w + 0.5, 0.25, d + 0.5);
    // Roof parapets, stairwell housing and ventilation equipment break up plain boxes.
    addBox(roofMat, x, h + 0.6, z - d * 0.15, w * 0.35, 1, d * 0.45);
    addBox(roofMat, x + w * 0.27, h + 0.4, z + d * 0.2, 1.2, 0.6, 1.6);
    if (london) {
      dummy.position.set(x, h + 1.15, z);
      dummy.rotation.set(0, Math.PI / 4, 0);
      dummy.scale.set(w * 0.76, 2.3, d * 0.76);
      dummy.updateMatrix();
      pitchedRoofs.push(dummy.matrix.clone());
      addBox(facades[i % facades.length], x + w * 0.3, h + 2, z - d * 0.22, 0.9, 3, 1.1);
      addBox(trim, x + w * 0.3, h + 3.5, z - d * 0.22, 1.2, 0.25, 1.4);
    }
    for (const sign of [-1, 1]) {
      addBox(trim, x + sign * w / 2, h + 0.45, z, 0.18, 0.7, d);
      addBox(trim, x, h + 0.45, z + sign * d / 2, w, 0.7, 0.18);
    }
    for (let floor = 0; floor < floors; floor++) {
      const y = 1.6 + floor * 2.7;
      for (let column = 0; column < 3; column++) {
        const offset = (column - 1) * w * 0.27;
        for (const sign of [-1, 1]) {
          addBox(glass, x + offset, y, z + sign * (d / 2 + 0.02), 1.25, 1.45, 0.08);
          if (london) {
            // White sash frames and lintels on the brick terraces.
            addBox(trim, x + offset, y, z + sign * (d / 2 + 0.08), 0.08, 1.5, 0.09);
            addBox(trim, x + offset, y, z + sign * (d / 2 + 0.09), 1.3, 0.08, 0.1);
            addBox(trim, x + offset, y + 0.78, z + sign * (d / 2 + 0.08), 1.6, 0.16, 0.18);
          }
          addBox(trim, x + offset, y - 0.8, z + sign * (d / 2 + 0.1), 1.5, 0.12, 0.25);
          addBox(glass, x + sign * (w / 2 + 0.02), y, z + (column - 1) * d * 0.27, 0.08, 1.45, 1.15);
        }
      }
    }
    addBox(doors, x - side * (w / 2 + 0.06), 1.05, z, 0.12, 2.1, 1.6);
    addBox(roofMat, x - side * (w / 2 + 0.7), 2.3, z, 1.6, 0.15, 2.3);
  }
  if (london) {
    const roofs = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 4), roofMat, pitchedRoofs.length);
    pitchedRoofs.forEach((matrix, i) => roofs.setMatrixAt(i, matrix));
    group.add(roofs);
  }
  for (const [mat, matrices] of batches) {
    const mesh = new THREE.InstancedMesh(box, mat, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    group.add(mesh);
  }

  const count = london ? 48 : milan ? 150 : 320;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.28, 1, 6), material(0x715540), count);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), material(0xffffff), count);
  const color = new THREE.Color();
  const greens = [0x315c45, 0x456c46, 0x577952, 0x3e654f];
  for (let i = 0; i < count; i++) {
    let x: number;
    let z: number;
    if (london && i < 16) {
      x = i < 8 ? -50 : 50;
      z = -25 + i % 8 * 12.5;
    } else if (!london && i < 48) {
      x = (i < 24 ? -46 : 46) + (random(i + 55) - 0.5) * 1.2;
      z = -28 + i % 24 * 4;
    } else {
      const angle = i * 2.399963;
      const radius = 105 + random(i + 93) * 95;
      x = Math.cos(angle) * radius;
      z = 18 + Math.sin(angle) * radius;
    }
    const size = (london ? 1.1 : 1.6) + random(i + 100) * (london ? 0.8 : 2);
    dummy.position.set(x, size * 0.65, z);
    dummy.rotation.set(0, random(i) * Math.PI, 0);
    dummy.scale.set(1, size * 1.3, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = size * 1.6;
    dummy.scale.set(size, size * (1.1 + random(i + 42) * 0.5), size);
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
    crowns.setColorAt(i, color.setHex(greens[i % greens.length]));
  }
  group.add(trunks, crowns);

  if (london) return group;
  // Overlapping irregular ridges hide the flat terrain perimeter on every side.
  const mountainGeometry = new THREE.ConeGeometry(1, 1, 9, 3);
  const vertices = mountainGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i);
    const z = vertices.getZ(i);
    const variation = 0.85 + Math.sin(x * 9 + z * 13) * 0.18;
    vertices.setXYZ(i, x * variation, vertices.getY(i), z * variation);
  }
  mountainGeometry.computeVertexNormals();
  const mountainCount = milan ? 10 : 64;
  const mountains = new THREE.InstancedMesh(mountainGeometry,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), mountainCount);
  // Overlay the actual top faces, rather than a scaled cone that intersects the ridge.
  const capGeometry = mountainGeometry.clone();
  const topFaces: number[] = [];
  const mountainIndices = mountainGeometry.index;
  if (mountainIndices) {
    for (let face = 0; face < mountainIndices.count; face += 3) {
      const indices = [mountainIndices.getX(face), mountainIndices.getX(face + 1), mountainIndices.getX(face + 2)];
      if (indices.every(index => vertices.getY(index) >= 1 / 6 - 0.001)) topFaces.push(...indices);
    }
  }
  capGeometry.setIndex(topFaces);
  const snowCaps = stadiumId === "san-siro" ? new THREE.InstancedMesh(capGeometry,
    new THREE.MeshStandardMaterial({ color: 0xf2f7fa, roughness: 1, flatShading: true,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }), mountainCount) : null;
  if (!snowCaps) capGeometry.dispose();
  if (snowCaps) snowCaps.name = "snow-covered-alpine-peaks";
  for (let i = 0; i < mountainCount; i++) {
    const layer = i < 32 ? 0 : 1;
    const angle = i % 32 / 32 * Math.PI * 2 + layer * 0.09;
    const radius = (layer ? 340 : 245) + random(i + 77) * 30;
    const height = milan ? 30 + random(i + 39) * 30 : (layer ? 70 : 35) + random(i + 39) * 55;
    dummy.position.set(milan ? -180 + i * 40 : Math.cos(angle) * radius, height / 2 - 6,
      milan ? -290 - random(i + 77) * 50 : 18 + Math.sin(angle) * radius);
    dummy.rotation.set(0, random(i + 8) * Math.PI, 0);
    dummy.scale.set(55 + random(i + 45) * 40, height, 45 + random(i + 98) * 35);
    dummy.updateMatrix();
    mountains.setMatrixAt(i, dummy.matrix);
    mountains.setColorAt(i, color.setHex(layer ? 0x8299a1 : (i % 2 ? 0x627b73 : 0x6e857b)));
    if (snowCaps) {
      snowCaps.setMatrixAt(i, dummy.matrix);
    }
  }
  group.add(mountains);
  if (snowCaps) group.add(snowCaps);
  return group;
}
