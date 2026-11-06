import * as THREE from "three";

/** Golden garden trees, with branching silhouettes, individual leaves and fallen foliage. */
export function createAutumnTrees(locations: number[][], miniature = false) {
  const grove = new THREE.Group(); grove.name = "home-ground-golden-garden-trees";
  const random = (seed: number) => { const n = Math.sin(seed * 47.17 + 17.9) * 43758.5453; return n - Math.floor(n); };
  const woodGeometry = new THREE.CylinderGeometry(0.62, 1, 1, 7);
  const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x66533e, roughness: 1 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 1 });
  leafMaterial.name = "golden-autumn-leaves";
  const leafGeometry = new THREE.BufferGeometry();
  leafGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
    0, -1, 0, -0.55, 0, 0.04, 0, 0.7, 0.12,
    0, -1, 0, 0, 0.7, 0.12, 0.55, 0, 0.04,
    -0.55, 0, 0.04, -0.3, 0.8, 0, 0, 0.7, 0.12,
    0, 0.7, 0.12, 0.3, 0.8, 0, 0.55, 0, 0.04,
  ], 3));
  leafGeometry.computeVertexNormals();
  const colors = [0xe8bc35, 0xf2ce59, 0xd69e2f, 0xe2af43, 0xc28b27, 0xefce73, 0xbba253];
  const transform = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), tint = new THREE.Color();
  locations.forEach(([x, z], index) => {
    const tree = new THREE.Group(); tree.name = `autumn-garden-tree-${index + 1}`;
    tree.position.set(x, 0, z); grove.add(tree);
    const branches: THREE.Matrix4[] = [], leaves: THREE.Matrix4[] = [];
    const seed = index * 211;
    const height = 5.8 + random(seed + 3) * 1.6;
    const segment = (a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
      const direction = b.clone().sub(a);
      transform.position.copy(a).add(b).multiplyScalar(0.5);
      transform.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      transform.scale.set(radius, direction.length(), radius); transform.updateMatrix(); branches.push(transform.matrix.clone());
    };
    const bend = new THREE.Vector3(0.18, height * 0.32, -0.07);
    segment(new THREE.Vector3(0, -0.12, 0), bend, 0.19);
    segment(bend, new THREE.Vector3(-0.12, height * 0.65, 0.13), 0.12);
    for (let branch = 0; branch < 8; branch++) {
      const angle = branch * 2.39996 + random(seed + branch);
      const reach = 1.5 + random(seed + branch + 8) * 0.8;
      const tip = new THREE.Vector3(Math.cos(angle) * reach, height * (0.7 + random(seed + branch + 13) * 0.22), Math.sin(angle) * reach);
      const elbow = bend.clone().lerp(tip, 0.6); elbow.y -= 0.2;
      segment(bend, elbow, 0.078); segment(elbow, tip, 0.044);
      for (let twig = 0; twig < 3; twig++) {
        const twigTip = tip.clone().add(new THREE.Vector3(Math.cos(angle + twig) * 0.4, 0.5 + random(seed + twig) * 0.6, Math.sin(angle + twig) * 0.4));
        segment(elbow.clone().lerp(tip, 0.5 + twig * 0.2), twigTip, 0.02);
      }
      const count = miniature ? 55 : 135;
      for (let leaf = 0; leaf < count; leaf++) {
        const n = seed + branch * 911 + leaf * 7;
        const angle = random(n) * Math.PI * 2, radius = Math.sqrt(random(n + 1)) * 1.35;
        transform.position.copy(tip).add(new THREE.Vector3(Math.cos(angle) * radius,
          (random(n + 2) - 0.35) * 2, Math.sin(angle) * radius));
        transform.rotation.set(random(n + 3) * Math.PI, random(n + 4) * Math.PI * 2, random(n + 5) * Math.PI);
        const size = 0.15 + random(n + 6) * 0.15;
        transform.scale.set(size * 0.85, size, size); transform.updateMatrix(); leaves.push(transform.matrix.clone());
      }
    }
    const wood = new THREE.InstancedMesh(woodGeometry, woodMaterial, branches.length);
    branches.forEach((matrix, i) => wood.setMatrixAt(i, matrix));
    const canopy = new THREE.InstancedMesh(leafGeometry, leafMaterial, leaves.length);
    canopy.name = "dense-yellow-leaf-canopy";
    leaves.forEach((matrix, i) => { canopy.setMatrixAt(i, matrix); canopy.setColorAt(i, tint.setHex(colors[(i + index) % colors.length])); });
    const fallenCount = miniature ? 24 : 110;
    const fallen = new THREE.InstancedMesh(leafGeometry, leafMaterial, fallenCount);
    fallen.name = "fallen-golden-leaves";
    for (let i = 0; i < fallenCount; i++) {
      const n = seed + i * 11;
      const angle = random(n) * Math.PI * 2, radius = Math.sqrt(random(n + 1)) * 3.4;
      transform.position.set(Math.cos(angle) * radius, 0.045 + i % 3 * 0.003, Math.sin(angle) * radius);
      transform.rotation.set(-Math.PI / 2, 0, random(n + 2) * Math.PI * 2);
      transform.scale.setScalar(0.1 + random(n + 3) * 0.07); transform.updateMatrix();
      fallen.setMatrixAt(i, transform.matrix); fallen.setColorAt(i, tint.setHex(colors[i % colors.length]));
    }
    tree.add(wood, canopy, fallen);
  });
  return grove;
}
