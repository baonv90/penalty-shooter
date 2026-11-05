import * as THREE from "three";
import { StadiumId } from "../../constants/stadiums";
import { getStadiumLayout } from "./stadiumLayout";
import { createStamfordBridgeRoof } from "./createStamfordBridge";

/** Shared by the full-size stadium and the simplified selection models. */
export function createLandmarkRoof(id: StadiumId) {
  if (id === "stamford-bridge") return createStamfordBridgeRoof();
  const group = new THREE.Group();
  group.name = `${id}-roof`;
  const milan = id === "san-siro";
  const layout = getStadiumLayout(id);
  const concrete = new THREE.MeshStandardMaterial({ color: milan ? 0xaeb3b5 : 0xd4dce0, roughness: 0.95 });
  const roof = new THREE.MeshStandardMaterial({ color: milan ? 0xaeb3b5 : 0xcbd5dd, roughness: 0.95, side: THREE.DoubleSide });
  roof.name = "gray-concrete-canopy";
  const accent = new THREE.MeshStandardMaterial({ color: milan ? 0xc34236 : 0x235db0, roughness: 0.85 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const batches = new Map<THREE.Material, THREE.Matrix4[]>();
  const dummy = new THREE.Object3D();
  const block = (material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    const matrices = batches.get(material) ?? [];
    matrices.push(dummy.matrix.clone());
    batches.set(material, matrices);
  };
  const height = layout.roofHeight;
  const sideWidth = layout.roofOuterX - layout.roofInnerX;
  const endWidth = layout.roofOuterZ - layout.roofInnerZ;
  const sideCenter = (layout.roofOuterX + layout.roofInnerX) / 2;
  const endCenter = (layout.roofOuterZ + layout.roofInnerZ) / 2;
  // A rectangular opening keeps the entire playing area open to the sky.
  for (const side of [-1, 1]) {
    block(roof, side * sideCenter, height, 18, sideWidth, milan ? 0.7 : 0.35, layout.roofOuterZ * 2);
    block(roof, 0, height, 18 + side * endCenter, layout.roofInnerX * 2, milan ? 0.7 : 0.35, endWidth);
    block(accent, side * layout.roofOuterX, height + 0.5, 18, 0.5, 0.7, layout.roofOuterZ * 2);
    block(accent, 0, height + 0.5, 18 + side * layout.roofOuterZ, layout.roofOuterX * 2, 0.7, 0.5);
    if (milan) {
      // Thin red ribs decorate the broad gray concrete canopy.
      block(accent, side * 40, height + 1.1, 18, 0.8, 1.2, 108);
      block(accent, 0, height + 1.1, 18 + side * 46, 98, 1.2, 0.8);
      for (let z = -28; z <= 64; z += 8) block(accent, side * sideCenter, height + 0.45, z, sideWidth, 0.2, 0.3);
      for (let x = -16; x <= 16; x += 8) block(accent, x, height + 0.45, 18 + side * endCenter, 0.3, 0.2, endWidth);
    }
  }
  if (milan) {
    const towerHeight = height + 2;
    const towerGeometry = new THREE.CylinderGeometry(4.6, 4.9, towerHeight, 32);
    const capGeometry = new THREE.CylinderGeometry(5.4, 5.4, 1, 32);
    for (const x of [-41, 41]) {
      for (const z of [-29, 65]) {
        const tower = new THREE.Mesh(towerGeometry, concrete);
        tower.name = "san-siro-corner-tower";
        tower.position.set(x, towerHeight / 2, z);
        const cap = new THREE.Mesh(capGeometry, accent);
        cap.position.set(x, towerHeight, z);
        // A continuous spiral ramp makes each of the four towers recognizable.
        const points = Array.from({ length: 145 }, (_, i) => {
          const angle = i / 144 * Math.PI * 2 * 9;
          return new THREE.Vector3(x + Math.cos(angle) * 5, 0.5 + i / 144 * (towerHeight - 1), z + Math.sin(angle) * 5);
        });
        const spiral = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 240, 0.32, 5, false), concrete);
        group.add(tower, cap, spiral);
      }
    }
  }
  for (const [material, matrices] of batches) {
    const mesh = new THREE.InstancedMesh(box, material, matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    group.add(mesh);
  }
  return group;
}
