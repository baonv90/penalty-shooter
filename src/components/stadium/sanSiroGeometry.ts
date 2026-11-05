import * as THREE from "three";

/** Rounded rectangle used by the concrete shell and the continuous seating rings. */
function outline(x: number, z: number, radius: number) {
  const points: THREE.Vector2[] = [];
  const corners = [
    [x - radius, -z + radius, -Math.PI / 2], [x - radius, z - radius, 0],
    [-x + radius, z - radius, Math.PI / 2], [-x + radius, -z + radius, Math.PI],
  ];
  for (const [cx, cz, start] of corners) {
    for (let i = 0; i <= 10; i++) {
      const angle = start + i / 10 * Math.PI / 2;
      points.push(new THREE.Vector2(cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius));
    }
  }
  return points;
}

export function createSanSiroRing(x: number, z: number, radius: number, thickness: number) {
  const shape = new THREE.Shape(outline(x, z, radius));
  shape.holes.push(new THREE.Path(outline(x - thickness, z - thickness, Math.max(0.4, radius - thickness)).reverse()));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 1 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Reuse box geometry and materials for all static beams and architectural details. */
export function createSanSiroBatch() {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const batches = new Map<THREE.Material, THREE.Matrix4[]>();
  const dummy = new THREE.Object3D();
  const direction = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const put = (material: THREE.Material) => {
    dummy.updateMatrix();
    const matrices = batches.get(material) ?? [];
    matrices.push(dummy.matrix.clone());
    batches.set(material, matrices);
  };
  const block = (material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
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
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      mesh.name = material.name;
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      group.add(mesh);
    }
    return group;
  };
  return { group, block, beam, finish };
}
