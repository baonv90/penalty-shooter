import * as THREE from "three";

const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Stops at the platform, then wraps only after both ends disappear into fog. */
export function getTrainPosition(elapsed: number) {
  const time = ((elapsed % 90) + 90) % 90;
  if (time < 36) return THREE.MathUtils.lerp(-680, 22, smooth(time / 36));
  if (time < 48) return 22;
  return THREE.MathUtils.lerp(22, 680, smooth((time - 48) / 42));
}

export function createStadiumRailway() {
  const group = new THREE.Group();
  group.name = "london-railway-and-station";
  const box = new THREE.BoxGeometry(1, 1, 1);
  const batches = new Map<THREE.Material, THREE.Matrix4[]>();
  const dummy = new THREE.Object3D();
  const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const ballast = mat(0x747b82);
  const steel = mat(0x3a4754);
  const platform = mat(0xb9b9ad);
  const yellow = mat(0xf6d16d);
  const blue = mat(0x245cb1);
  const block = (material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    const matrices = batches.get(material) ?? [];
    matrices.push(dummy.matrix.clone());
    batches.set(material, matrices);
  };
  block(ballast, 67, 0.06, 0, 5.8, 0.15, 1500);
  for (const x of [65.9, 68.1]) block(steel, x, 0.25, 0, 0.12, 0.18, 1500);
  for (let z = -748; z < 750; z += 2) block(steel, 67, 0.13, z, 3.5, 0.15, 0.32);
  block(platform, 62, 0.5, 0, 4, 1, 60);
  block(yellow, 63.7, 1.015, 0, 0.22, 0.03, 60);
  block(blue, 61.5, 4.1, 0, 4, 0.25, 54);
  for (const z of [-24, -12, 0, 12, 24]) block(steel, 60.5, 2.5, z, 0.18, 3, 0.18);
  // The station exits join the same crossings used by arriving supporters.
  for (const z of [0, 36]) block(platform, 60, 0.03, z, 7, 0.04, 4);
  for (const [material, matrices] of batches) {
    const instances = new THREE.InstancedMesh(box, material, matrices.length);
    matrices.forEach((matrix, index) => instances.setMatrixAt(index, matrix));
    group.add(instances);
  }
  const train = new THREE.Group();
  train.name = "arriving-london-train";
  const white = mat(0xe4e9e9);
  const red = mat(0xc9443f);
  const glass = mat(0x203e54);
  const wheelGeometry = new THREE.CylinderGeometry(0.36, 0.36, 0.2, 8);
  const trainBatches = new Map<THREE.Material, THREE.Matrix4[]>();
  const wheelMatrices: THREE.Matrix4[] = [];
  const part = (material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    const matrices = trainBatches.get(material) ?? [];
    matrices.push(dummy.matrix.clone());
    trainBatches.set(material, matrices);
  };
  for (let car = 0; car < 4; car++) {
    const z = -car * 12;
    part(white, 0, 1.9, z, 2.8, 2.5, 11.2);
    part(blue, 0, 1, z, 2.85, 0.55, 11.25);
    part(red, 0, 2, z + 5.65, 2.85, 2.3, 0.12);
    part(glass, 0, 2.5, z + 5.73, 2.3, 0.8, 0.05);
    for (const side of [-1, 1]) {
      for (let window = 0; window < 5; window++) part(glass, side * 1.42, 2.4, z - 4 + window * 2, 0.04, 0.9, 1.3);
      for (const axle of [-3.8, 3.8]) {
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.position.set(side * 1.3, 0.5, z + axle);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        wheelMatrices.push(dummy.matrix.clone());
      }
    }
  }
  for (const [material, matrices] of trainBatches) {
    const instances = new THREE.InstancedMesh(box, material, matrices.length);
    matrices.forEach((matrix, index) => instances.setMatrixAt(index, matrix));
    train.add(instances);
  }
  const wheels = new THREE.InstancedMesh(wheelGeometry, steel, wheelMatrices.length);
  wheelMatrices.forEach((matrix, index) => wheels.setMatrixAt(index, matrix));
  train.add(wheels);
  train.position.x = 67;
  group.add(train);
  return { group, update: (time: number) => { train.position.z = getTrainPosition(time + 24); } };
}
