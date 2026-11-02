import * as THREE from "three";

/** One rounded road loop shared by lane geometry and car animation. */
export function createRoadRoute(offset = 0) {
  const x = 53 + offset;
  const near = -44 - offset;
  const far = 80 + offset;
  const r = 9 + offset;
  const path = new THREE.Path();
  path.moveTo(-x + r, near);
  path.lineTo(x - r, near);
  path.quadraticCurveTo(x, near, x, near + r);
  path.lineTo(x, far - r);
  path.quadraticCurveTo(x, far, x - r, far);
  path.lineTo(-x + r, far);
  path.quadraticCurveTo(-x, far, -x, far - r);
  path.lineTo(-x, near + r);
  path.quadraticCurveTo(-x, near, -x + r, near);
  return path;
}

export function createStadiumRoads() {
  const group = new THREE.Group();
  group.name = "connected-stadium-roads";
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 1 });
  const paving = new THREE.MeshStandardMaterial({ color: 0xa5afb9, roughness: 1 });
  const paint = new THREE.MeshBasicMaterial({ color: 0xf4eedc });
  const ribbon = (outerOffset: number, innerOffset: number, y: number, material: THREE.Material) => {
    const outer = createRoadRoute(outerOffset);
    const inner = createRoadRoute(innerOffset);
    const points: number[] = [];
    const indices: number[] = [];
    // Sample matching curve parameters to keep the inside/outside corner vertices aligned.
    for (let i = 0; i <= 192; i++) {
      const a = outer.getPoint(i / 192);
      const b = inner.getPoint(i / 192);
      points.push(a.x, y, a.y, b.x, y, b.y);
      if (i < 192) {
        const j = i * 2;
        indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    group.add(new THREE.Mesh(geometry, material));
  };
  ribbon(4, -4, 0.04, asphalt);
  ribbon(-4.1, -7.5, 0.045, paving);
  ribbon(7, 4.1, 0.045, paving);
  ribbon(3.65, 3.5, 0.055, paint);
  ribbon(-3.5, -3.65, 0.055, paint);

  const transforms: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  const marking = (x: number, z: number, width: number, depth: number, angle = 0) => {
    dummy.position.set(x, 0.065, z);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(width, 0.02, depth);
    dummy.updateMatrix();
    transforms.push(dummy.matrix.clone());
  };
  const route = createRoadRoute();
  const count = Math.floor(route.getLength() / 5);
  for (let i = 0; i < count; i++) {
    const point = route.getPointAt(i / count);
    const tangent = route.getTangentAt(i / count);
    // Leave clean gaps at pedestrian crossings.
    if (Math.abs(Math.abs(point.x) - 53) < 1 && (Math.abs(point.y) < 3 || Math.abs(point.y - 36) < 3)) continue;
    marking(point.x, point.y, 0.15, 2.5, Math.atan2(tangent.x, tangent.y));
  }
  // Zebra crossings, approach bars and directional arrows on both carriageways.
  for (const side of [-1, 1]) {
    for (const z of [0, 36]) {
      for (let i = 0; i < 9; i++) marking(side * 53 - 3.5 + i * 0.85, z, 0.45, 3.5);
      marking(side * 53 - 1.7, z + 3, 3, 0.22);
      marking(side * 53 + 1.7, z - 3, 3, 0.22);
    }
    for (const z of [-22, 18, 57]) {
      const x = side * 53;
      marking(x - 1.7, z, 0.16, 2.4);
      marking(x - 2, z - 0.8, 0.15, 0.9, -0.7);
      marking(x - 1.4, z - 0.8, 0.15, 0.9, 0.7);
      marking(x + 1.7, z, 0.16, 2.4);
      marking(x + 1.4, z + 0.8, 0.15, 0.9, -0.7);
      marking(x + 2, z + 0.8, 0.15, 0.9, 0.7);
    }
  }
  const paintInstances = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), paint, transforms.length);
  transforms.forEach((matrix, i) => paintInstances.setMatrixAt(i, matrix));
  group.add(paintInstances);

  // Spurs connect the perimeter sidewalk, crossings, parking and each stadium gate.
  const paths: THREE.Matrix4[] = [];
  for (const side of [-1, 1]) {
    for (const z of [0, 36]) {
      dummy.position.set(side * 42, 0.035, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(13, 0.03, 4);
      dummy.updateMatrix();
      paths.push(dummy.matrix.clone());
      dummy.position.set(side * 61, 0.035, z);
      dummy.scale.set(7, 0.03, 4);
      dummy.updateMatrix();
      paths.push(dummy.matrix.clone());
    }
  }
  const walkways = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), paving, paths.length);
  paths.forEach((matrix, i) => walkways.setMatrixAt(i, matrix));
  group.add(walkways);
  return group;
}
