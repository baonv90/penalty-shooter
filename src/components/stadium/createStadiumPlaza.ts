import * as THREE from "three";

/** A continuous pedestrian precinct between the London ground and its terraces. */
export function createStadiumPlaza() {
  const group = new THREE.Group();
  group.name = "stadium-pedestrian-plaza";
  const box = new THREE.BoxGeometry(1, 1, 1);
  const paving = new THREE.MeshStandardMaterial({ color: 0xb1ada2, roughness: 1 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xccc9bd, roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3d4c53, roughness: 0.8 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x967658, roughness: 1 });
  const batches = new Map<THREE.Material, THREE.Matrix4[]>();
  const dummy = new THREE.Object3D();
  const block = (material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    const matrices = batches.get(material) ?? [];
    matrices.push(dummy.matrix.clone());
    batches.set(material, matrices);
  };
  for (const side of [-1, 1]) {
    block(paving, side * 51, 0.04, 18, 22, 0.06, 144);
    block(paving, 0, 0.04, 18 + side * 59, 80, 0.06, 26);
    for (let z = -50; z <= 86; z += 4) block(trim, side * 51, 0.075, z, 22, 0.012, 0.06);
    for (let x = -60; x <= 60; x += 4) block(trim, x, 0.075, 18 + side * 59, 0.06, 0.012, 26);
    for (const z of [-18, 18, 54]) {
      block(iron, side * 51.5, 2.6, z, 0.14, 5.2, 0.14);
      block(trim, side * 51.5, 5.25, z, 0.7, 0.3, 0.7);
      block(wood, side * 51, 0.55, z + 4, 0.8, 0.18, 2.5);
      block(iron, side * 51, 0.25, z + 3.3, 0.6, 0.5, 0.15);
      block(iron, side * 51, 0.25, z + 4.7, 0.6, 0.5, 0.15);
    }
  }
  for (const [material, matrices] of batches) {
    const instances = new THREE.InstancedMesh(box, material, matrices.length);
    matrices.forEach((matrix, index) => instances.setMatrixAt(index, matrix));
    group.add(instances);
  }
  return group;
}
