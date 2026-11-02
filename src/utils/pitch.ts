import * as THREE from "three";

// One field layout shared by the mowing stripes and all painted markings.
export const FIELD = { width: 32, nearZ: -4.04, farZ: 40 };
const length = FIELD.farZ - FIELD.nearZ;
const centerZ = (FIELD.nearZ + FIELD.farZ) / 2;

export function createFieldGrass() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });
  const apron = new THREE.Mesh(new THREE.CircleGeometry(88, 64), material);
  apron.rotation.x = -Math.PI / 2;
  apron.position.z = centerZ;
  apron.receiveShadow = true;
  group.add(apron);

  const count = 22;
  const stripeLength = length / count;
  const stripes = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(FIELD.width, stripeLength),
    new THREE.MeshStandardMaterial({ roughness: 0.9 }), count
  );
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  dummy.rotation.x = -Math.PI / 2;
  for (let i = 0; i < count; i++) {
    dummy.position.set(0, 0.005, FIELD.nearZ + (i + 0.5) * stripeLength);
    dummy.updateMatrix();
    stripes.setMatrixAt(i, dummy.matrix);
    stripes.setColorAt(i, color.setHex(i % 2 === 0 ? 0x2e7d32 : 0x388e3c));
  }
  stripes.receiveShadow = true;
  group.add(stripes);
  return group;
}

export function createFieldMarkings() {
  const group = new THREE.Group();
  group.name = "pitch-markings";
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const segments: [number, number, number, number][] = [];
  const line = (x: number, z: number, width: number, depth: number) => segments.push([x, z, width, depth]);
  line(0, FIELD.nearZ, FIELD.width, 0.12);
  line(0, FIELD.farZ, FIELD.width, 0.12);
  line(-FIELD.width / 2, centerZ, 0.12, length);
  line(FIELD.width / 2, centerZ, 0.12, length);
  line(0, centerZ, FIELD.width, 0.12);
  for (const end of [FIELD.nearZ, FIELD.farZ]) {
    const direction = end === FIELD.nearZ ? 1 : -1;
    for (const [width, depth] of [[20, 10], [11.4, 3.94]]) {
      line(-width / 2, end + direction * depth / 2, 0.12, depth);
      line(width / 2, end + direction * depth / 2, 0.12, depth);
      line(0, end + direction * depth, width, 0.12);
    }
  }
  const lines = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, segments.length);
  const dummy = new THREE.Object3D();
  segments.forEach(([x, z, width, depth], index) => {
    dummy.position.set(x, 0.025, z);
    dummy.scale.set(width, 0.02, depth);
    dummy.updateMatrix();
    lines.setMatrixAt(index, dummy.matrix);
  });
  group.add(lines);
  const circle = new THREE.Mesh(new THREE.RingGeometry(4.4, 4.5, 48), material);
  circle.rotation.x = -Math.PI / 2;
  circle.position.set(0, 0.04, centerZ);
  group.add(circle);
  const spotGeometry = new THREE.CircleGeometry(0.15, 16);
  for (const z of [2, centerZ, FIELD.farZ - (2 - FIELD.nearZ)]) {
    const spot = new THREE.Mesh(spotGeometry, material);
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, 0.04, z);
    group.add(spot);
  }
  return group;
}
