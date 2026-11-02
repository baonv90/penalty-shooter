import * as THREE from "three";

/** Static, instanced neighborhood and layered terrain; no frame-by-frame work. */
export function createStadiumLandscape() {
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
  const facades = [0xbca995, 0xd6cfc1, 0xa6b1b5, 0x9f8472].map(material);
  const trim = material(0xe5dfd4);
  const glass = new THREE.MeshStandardMaterial({ color: 0x42637a, metalness: 0.3, roughness: 0.35 });
  const roofMat = material(0x59616a);
  const doors = material(0x273945);
  const addBox = (mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    const batch = batches.get(mat) ?? [];
    batch.push(dummy.matrix.clone());
    batches.set(mat, batch);
  };
  for (let i = 0; i < 28; i++) {
    const side = i < 14 ? -1 : 1;
    const x = side * (75 + random(i + 1) * 20);
    const z = -65 + i % 14 * 13 + random(i + 31) * 5;
    const floors = 2 + Math.floor(random(i + 7) * 5);
    const h = floors * 2.7;
    const w = 7 + random(i + 13) * 6;
    const d = 7 + random(i + 21) * 4;
    addBox(facades[i % facades.length], x, h / 2, z, w, h, d);
    addBox(trim, x, 0.35, z, w + 0.25, 0.7, d + 0.25);
    addBox(trim, x, h + 0.1, z, w + 0.5, 0.25, d + 0.5);
    // Roof parapets, stairwell housing and ventilation equipment break up plain boxes.
    addBox(roofMat, x, h + 0.6, z - d * 0.15, w * 0.35, 1, d * 0.45);
    addBox(roofMat, x + w * 0.27, h + 0.4, z + d * 0.2, 1.2, 0.6, 1.6);
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
          addBox(trim, x + offset, y - 0.8, z + sign * (d / 2 + 0.1), 1.5, 0.12, 0.25);
          addBox(glass, x + sign * (w / 2 + 0.02), y, z + (column - 1) * d * 0.27, 0.08, 1.45, 1.15);
        }
      }
    }
    addBox(doors, x - side * (w / 2 + 0.06), 1.05, z, 0.12, 2.1, 1.6);
    addBox(roofMat, x - side * (w / 2 + 0.7), 2.3, z, 1.6, 0.15, 2.3);
  }
  for (const [mat, matrices] of batches) {
    const mesh = new THREE.InstancedMesh(box, mat, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    group.add(mesh);
  }

  const count = 320;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.28, 1, 6), material(0x715540), count);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), material(0xffffff), count);
  const color = new THREE.Color();
  const greens = [0x315c45, 0x456c46, 0x577952, 0x3e654f];
  for (let i = 0; i < count; i++) {
    let x: number;
    let z: number;
    if (i < 48) {
      x = (i < 24 ? -46 : 46) + (random(i + 55) - 0.5) * 1.2;
      z = -28 + i % 24 * 4;
    } else {
      const angle = i * 2.399963;
      const radius = 105 + random(i + 93) * 95;
      x = Math.cos(angle) * radius;
      z = 18 + Math.sin(angle) * radius;
    }
    const size = 1.6 + random(i + 100) * 2;
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
  const mountains = new THREE.InstancedMesh(mountainGeometry,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), 64);
  for (let i = 0; i < 64; i++) {
    const layer = i < 32 ? 0 : 1;
    const angle = i % 32 / 32 * Math.PI * 2 + layer * 0.09;
    const radius = (layer ? 340 : 245) + random(i + 77) * 30;
    const height = (layer ? 70 : 35) + random(i + 39) * 55;
    dummy.position.set(Math.cos(angle) * radius, height / 2 - 6, 18 + Math.sin(angle) * radius);
    dummy.rotation.set(0, random(i + 8) * Math.PI, 0);
    dummy.scale.set(55 + random(i + 45) * 40, height, 45 + random(i + 98) * 35);
    dummy.updateMatrix();
    mountains.setMatrixAt(i, dummy.matrix);
    mountains.setColorAt(i, color.setHex(layer ? 0x8299a1 : (i % 2 ? 0x627b73 : 0x6e857b)));
  }
  group.add(mountains);
  return group;
}
