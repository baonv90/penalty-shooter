import * as THREE from "three";

/** Open, branching cherry crowns made of small blossoms rather than solid canopy balls. */
export function createCherryTrees(locations: number[][], miniature = false) {
  const grove = new THREE.Group();
  grove.name = "home-ground-blooming-cherry-trees";
  const random = (seed: number) => { const value = Math.sin(seed * 78.233 + 3.7) * 43758.5453; return value - Math.floor(value); };
  const branchGeometry = new THREE.CylinderGeometry(0.65, 1, 1, 7);
  const bark = new THREE.MeshStandardMaterial({ color: 0x655146, roughness: 1 });
  bark.name = "cherry-tree-textured-bark";
  const flowerMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.95 });
  flowerMaterial.name = "individual-cherry-blossoms";
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x83906a, side: THREE.DoubleSide, roughness: 1 });
  const mulchMaterial = new THREE.MeshStandardMaterial({ color: 0x655a47, roughness: 1 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xbdb8a2, roughness: 1 });
  const leafGeometry = new THREE.CircleGeometry(1, 5);
  const mulchGeometry = new THREE.CircleGeometry(0.65, 20);
  const rimGeometry = new THREE.RingGeometry(0.65, 0.8, 20);
  const vertices: number[] = [], normals: number[] = [];
  // Five separate cupped petals, with a small warm center. Vertex colors stay shared.
  const petalColors: number[] = [];
  const petal = new THREE.Color(0xfff2f5), centerColor = new THREE.Color(0xe7bc7b);
  const triangle = (points: THREE.Vector3[], color: THREE.Color) => {
    for (const point of points) {
      vertices.push(point.x, point.y, point.z); normals.push(0, 0, 1);
      petalColors.push(color.r, color.g, color.b);
    }
  };
  for (let p = 0; p < 5; p++) {
    const angle = p * Math.PI * 2 / 5;
    const point = (along: number, across: number, cup: number) => new THREE.Vector3(
      Math.cos(angle) * along - Math.sin(angle) * across,
      Math.sin(angle) * along + Math.cos(angle) * across, cup);
    const a = point(0.1, 0, 0), b = point(0.65, -0.36, 0.1), c = point(1, -0.14, 0.2);
    const d = point(1, 0.14, 0.2), e = point(0.65, 0.36, 0.1);
    triangle([a, b, c], petal); triangle([a, c, d], petal); triangle([a, d, e], petal);
    triangle([new THREE.Vector3(0, 0, 0.04), point(0.2, -0.08, 0.04), point(0.2, 0.08, 0.04)], centerColor);
  }
  const flowers = new THREE.BufferGeometry();
  flowers.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  flowers.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  flowers.setAttribute("color", new THREE.Float32BufferAttribute(petalColors, 3));
  flowerMaterial.vertexColors = true;
  const transform = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();
  const blossomColors = [0xffffff, 0xfff5f7, 0xfce5ed, 0xf4cbdc, 0xfff9f0];

  locations.forEach(([x, z], index) => {
    const tree = new THREE.Group();
    tree.name = `flowering-cherry-${index + 1}`; tree.position.set(x, 0, z); grove.add(tree);
    const branches: THREE.Matrix4[] = [], buds: { position: THREE.Vector3; size: number; seed: number }[] = [];
    const leaves: THREE.Matrix4[] = [];
    const seed = index * 313 + 11;
    const scale = 0.9 + random(seed) * 0.17;
    const segment = (a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
      const direction = b.clone().sub(a);
      transform.position.copy(a).add(b).multiplyScalar(0.5);
      transform.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      transform.scale.set(radius, direction.length(), radius); transform.updateMatrix();
      branches.push(transform.matrix.clone());
    };
    // A leaning, tapering trunk with exposed roots and several uneven forks.
    const trunk = [new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(-0.09, 0.95, 0.06),
      new THREE.Vector3(0.13, 1.85, -0.06), new THREE.Vector3(0.04, 2.7, 0.06), new THREE.Vector3(0.31, 3.45, 0.09)];
    for (let i = 0; i < trunk.length - 1; i++) segment(trunk[i], trunk[i + 1], (0.18 - i * 0.029) * scale);
    for (let root = 0; root < 5; root++) {
      const angle = root * 1.256 + random(seed);
      segment(new THREE.Vector3(0, 0.36, 0), new THREE.Vector3(Math.cos(angle) * 0.5, 0.1, Math.sin(angle) * 0.5), 0.075);
    }
    for (let branch = 0; branch < 8; branch++) {
      const angle = branch * 2.39996 + random(seed + branch) * 0.3;
      const start = trunk[branch % 2 + 2];
      const spread = (1.35 + random(seed + branch + 1) * 0.55) * scale;
      const elbow = new THREE.Vector3(Math.cos(angle) * spread * 0.6, 2.85 + random(seed + branch + 2) * 0.7, Math.sin(angle) * spread * 0.6);
      const end = new THREE.Vector3(Math.cos(angle) * spread, 3.8 + random(seed + branch + 3) * 0.75, Math.sin(angle) * spread);
      segment(start, elbow, 0.08); segment(elbow, end, 0.053);
      for (let fork = 0; fork < 4; fork++) {
        const forkSeed = seed + branch * 31 + fork * 7;
        const forkAngle = angle + (fork - 1.5) * 0.48;
        const base = elbow.clone().lerp(end, 0.3 + fork * 0.17);
        const tip = base.clone().add(new THREE.Vector3(Math.cos(forkAngle) * (0.45 + random(forkSeed) * 0.3),
          0.45 + random(forkSeed + 1) * 0.8, Math.sin(forkAngle) * (0.45 + random(forkSeed) * 0.3)));
        segment(base, tip, 0.023);
        const twigEnd = tip.clone().add(new THREE.Vector3(Math.cos(forkAngle + 0.4) * 0.25, 0.3, Math.sin(forkAngle + 0.4) * 0.25));
        segment(tip, twigEnd, 0.012);
        const count = miniature ? 18 : 48;
        // Irregular sprays follow each twig, with gaps between branches and smaller tip buds.
        for (let flower = 0; flower < count; flower++) {
          const flowerSeed = forkSeed * 107 + flower * 5;
          const along = random(flowerSeed);
          const position = base.clone().lerp(twigEnd, along);
          const azimuth = random(flowerSeed + 1) * Math.PI * 2;
          const radius = Math.sqrt(random(flowerSeed + 2)) * (0.2 + Math.sin(along * Math.PI) * 0.45);
          position.add(new THREE.Vector3(Math.cos(azimuth) * radius, (random(flowerSeed + 3) - 0.5) * 0.65, Math.sin(azimuth) * radius));
          buds.push({ position, size: (0.065 + random(flowerSeed + 4) * 0.055) * (miniature ? 1.55 : 1), seed: flowerSeed });
        }
        transform.position.copy(tip); transform.rotation.set(random(forkSeed) * 2, forkAngle, random(forkSeed + 9));
        transform.scale.set(0.075, 0.16, 1); transform.updateMatrix(); leaves.push(transform.matrix.clone());
      }
    }
    const wood = new THREE.InstancedMesh(branchGeometry, bark, branches.length);
    wood.name = "tapered-cherry-trunk-and-twigs";
    branches.forEach((matrix, i) => wood.setMatrixAt(i, matrix));
    wood.castShadow = true;
    const blossomMesh = new THREE.InstancedMesh(flowers, flowerMaterial, buds.length);
    blossomMesh.name = "five-petal-cherry-blossoms";
    buds.forEach((bud, i) => {
      transform.position.copy(bud.position);
      transform.rotation.set(random(bud.seed + 6) * Math.PI, random(bud.seed + 7) * Math.PI * 2, random(bud.seed + 8) * Math.PI);
      transform.scale.setScalar(bud.size); transform.updateMatrix(); blossomMesh.setMatrixAt(i, transform.matrix);
      blossomMesh.setColorAt(i, tint.setHex(blossomColors[Math.floor(random(bud.seed + 9) * blossomColors.length)]));
    });
    const leafMesh = new THREE.InstancedMesh(leafGeometry, leafMaterial, leaves.length);
    leaves.forEach((matrix, i) => leafMesh.setMatrixAt(i, matrix));
    const mulch = new THREE.Mesh(mulchGeometry, mulchMaterial), rim = new THREE.Mesh(rimGeometry, rimMaterial);
    for (const mesh of [mulch, rim]) { mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.105; }
    tree.add(wood, blossomMesh, leafMesh, mulch, rim);
  });
  return grove;
}
