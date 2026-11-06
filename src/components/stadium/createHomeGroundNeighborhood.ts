import * as THREE from "three";
import { createAutumnTrees } from "./createAutumnTrees";

/** Close-set pavillons inspired by Cormeilles: meulière, brick, render and varied attic roofs. */
export function createHomeGroundNeighborhood(miniature = false) {
  const neighborhood = new THREE.Group(); neighborhood.name = "home-ground-surrounding-maisons";
  const box = new THREE.BoxGeometry(1, 1, 1);
  const material = (name: string, color: number) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95 }); mat.name = name; return mat;
  };
  const stone = material("maison-meuliere-stone", 0xc7ac88), brick = material("maison-red-brick", 0xa35f48);
  const renders = [0xe8dfc7, 0xded3bc, 0xe8d8c7, 0xd9dfd6].map((color, i) => material(`maison-render-${i}`, color));
  const ivory = material("maison-limestone-trim", 0xf3ead4), iron = material("maison-iron-railings", 0x35443c);
  const wood = material("maison-entry-oak", 0x665443), hedge = material("maison-garden-hedges", 0x596d3c);
  const glass = new THREE.MeshStandardMaterial({ color: 0x66858a, roughness: 0.3, metalness: 0.12 }); glass.name = "maison-window-glass";
  const shutters = [0x657a70, 0x6c7c8a, 0xe1dfd1].map((color, i) => material(`maison-shutters-${i}`, color));
  const redRoof = material("maison-red-tiled-roof", 0xa35840), slate = material("maison-slate-roof", 0x49525a);
  redRoof.side = slate.side = THREE.DoubleSide;
  const garden = material("maison-private-garden", 0x88976a), paving = material("maison-stone-paths", 0xc5bfaa);
  // Repeatable rough stone and roof courses use data textures, also available in non-browser previews.
  const surfaceTexture = (roof: boolean) => {
    const size = 96, pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const row = Math.floor(y / 16), xx = (x + row % 2 * 12) % 24;
      const noise = Math.sin(x * 127.1 + y * 311.7) * 43758.54;
      const grain = noise - Math.floor(noise);
      const joint = y % 16 < 1 || xx < 1;
      const value = Math.floor(joint ? (roof ? 130 : 175) : (roof ? 225 : 208) + grain * 35);
      const offset = (y * size + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value; pixels[offset + 3] = 255;
    }
    const texture = new THREE.DataTexture(pixels, size, size);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
    return texture;
  };
  stone.map = surfaceTexture(false); stone.map.repeat.set(6, 5);
  redRoof.map = slate.map = surfaceTexture(true);
  const transform = new THREE.Object3D();
  const batches: { parent: THREE.Group; material: THREE.Material; matrices: THREE.Matrix4[] }[] = [];
  const block = (parent: THREE.Group, mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    let batch = batches.find(batch => batch.parent === parent && batch.material === mat);
    if (!batch) { batch = { parent, material: mat, matrices: [] }; batches.push(batch); }
    transform.position.set(x, y, z); transform.rotation.set(0, 0, 0); transform.scale.set(w, h, d); transform.updateMatrix();
    batch.matrices.push(transform.matrix.clone());
  };
  const meshFaces = (parent: THREE.Group, name: string, faces: number[][][], mat: THREE.Material) => {
    const vertices: number[] = [], uvs: number[] = [];
    for (const face of faces) {
      const triangles = face.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3];
      for (const index of triangles) {
        const point = face[index]; vertices.push(...point);
        uvs.push(point[0] / 1.4, (point[1] + point[2]) / 1.4);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, mat); mesh.name = name; mesh.castShadow = true; parent.add(mesh);
  };
  const roof = (parent: THREE.Group, kind: string, x: number, base: number, z: number, w: number, d: number, rise: number, mat: THREE.Material, wall: THREE.Material) => {
    const a = w / 2 + 0.6, b = d / 2 + 0.6;
    const p = (u: number, y: number, v: number) => [x + u, base + y, z + v];
    const corners = [p(-a, 0, -b), p(a, 0, -b), p(a, 0, b), p(-a, 0, b)];
    if (kind === "gable" || kind === "cross-gable") {
      const front = p(0, rise, b), back = p(0, rise, -b);
      meshFaces(parent, "maison-steep-gabled-roof", [[corners[0], corners[3], front, back], [corners[2], corners[1], back, front]], mat);
      meshFaces(parent, "maison-gable-masonry", [[p(-w / 2, -0.12, d / 2), p(w / 2, -0.12, d / 2), p(0, rise - 0.1, d / 2)],
        [p(w / 2, -0.12, -d / 2), p(-w / 2, -0.12, -d / 2), p(0, rise - 0.1, -d / 2)]], wall);
      block(parent, mat, x, base + rise, z, 0.2, 0.18, d + 1.4);
    } else if (kind === "mansard") {
      const inner = [p(-a * 0.7, rise * 0.68, -b * 0.7), p(a * 0.7, rise * 0.68, -b * 0.7),
        p(a * 0.7, rise * 0.68, b * 0.7), p(-a * 0.7, rise * 0.68, b * 0.7)];
      const left = p(-a * 0.28, rise, 0), right = p(a * 0.28, rise, 0);
      const faces = corners.map((corner, i) => [corner, corners[(i + 1) % 4], inner[(i + 1) % 4], inner[i]]);
      faces.push([inner[0], inner[1], right, left], [inner[2], inner[3], left, right], [inner[3], inner[0], left], [inner[1], inner[2], right]);
      meshFaces(parent, "maison-slate-mansard-roof", faces, mat);
      for (const dx of [-w * 0.25, w * 0.25]) {
        block(parent, ivory, x + dx, base + 1.4, z + d * 0.47, 1.9, 1.6, 0.85);
        block(parent, glass, x + dx, base + 1.4, z + d * 0.47 + 0.44, 1.35, 1.15, 0.08);
        block(parent, mat, x + dx, base + 2.28, z + d * 0.47, 2.2, 0.16, 1.25);
      }
    } else {
      const left = p(-a * 0.32, rise, 0), right = p(a * 0.32, rise, 0);
      meshFaces(parent, "maison-hipped-tiled-roof", [[corners[0], corners[1], right, left], [corners[2], corners[3], left, right],
        [corners[3], corners[0], left], [corners[1], corners[2], right]], mat);
    }
    block(parent, ivory, x, base - 0.12, z, w + 1.1, 0.22, d + 1.1);
  };
  const treeLocations: number[][] = [];
  const kinds = ["meuliere-gable", "slate-mansard", "cross-gable", "brick-townhouse", "rendered-pavillon"];
  for (const side of [-1, 1]) for (let row = 0; row < 5; row++) {
    const i = (side === -1 ? 0 : 5) + row;
    const kind = kinds[(row + (side === 1 ? 2 : 0)) % kinds.length];
    const plot = new THREE.Group(); plot.name = `neighborhood-maison-${i + 1}`;
    plot.position.set(side === -1 ? -60 : 55.5, 0, -35 + row * 20.5);
    plot.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    plot.userData.maison = true; plot.userData.style = kind; neighborhood.add(plot);
    const house = new THREE.Group(); house.name = "maison-building"; plot.add(house);
    const w = 15.5 + i % 3, d = 17 + i % 2;
    const floors = kind === "brick-townhouse" ? 3 : 2, height = floors * 3.2;
    const facade = kind === "meuliere-gable" ? stone : kind === "brick-townhouse" ? brick : renders[i % renders.length];
    const roofMat = kind === "slate-mansard" || kind === "brick-townhouse" ? slate : redRoof;
    block(house, facade, 0, height / 2, 0, w, height, d);
    block(house, stone, 0, 0.5, 0, w + 0.15, 1, d + 0.15);
    for (let floor = 1; floor < floors; floor++) block(house, ivory, 0, floor * 3.2, 0, w + 0.15, 0.14, d + 0.15);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      block(house, brick, sx * (w / 2 - 0.22), height / 2, sz * (d / 2 + 0.025), 0.44, height, 0.14);
    }
    const window = (x: number, y: number, z: number, back = false) => {
      const sign = back ? -1 : 1;
      block(house, ivory, x, y, z, 1.95, 2.05, 0.22);
      block(house, glass, x, y, z + sign * 0.14, 1.55, 1.72, 0.09);
      block(house, ivory, x, y, z + sign * 0.2, 0.07, 1.8, 0.06);
      block(house, ivory, x, y, z + sign * 0.2, 1.65, 0.07, 0.06);
      block(house, brick, x, y + 1.14, z, 2.2, 0.2, 0.32);
      for (const shutter of [-1, 1]) block(house, shutters[i % 3], x + shutter * 1.24, y, z + sign * 0.06, 0.52, 1.95, 0.16);
      block(house, ivory, x, y - 1.08, z + sign * 0.18, 2.15, 0.14, 0.5);
      if (y > 3) {
        block(house, iron, x, y - 0.38, z + sign * 0.48, 1.95, 0.06, 0.06);
        for (let bar = 0; bar < 7; bar++) block(house, iron, x - 0.9 + bar * 0.3, y - 0.69, z + sign * 0.48, 0.035, 0.62, 0.035);
      }
    };
    for (let floor = 0; floor < floors; floor++) for (const back of [false, true]) {
      for (const x of [-w * 0.31, 0, w * 0.31]) {
        if (!back && floor === 0 && x === 0) continue;
        window(x, 1.7 + floor * 3.2, (back ? -1 : 1) * (d / 2 + 0.04), back);
      }
    }
    block(house, wood, 0, 1.35, d / 2 + 0.08, 1.7, 2.7, 0.2);
    block(house, ivory, 0, 0.12, d / 2 + 0.7, 3, 0.24, 1.6);
    block(house, iron, 0, 2.95, d / 2 + 0.65, 2.5, 0.1, 1.5);
    const roofKind = kind === "slate-mansard" ? "mansard" : kind === "meuliere-gable" || kind === "brick-townhouse" ? "gable" : "hip";
    roof(house, roofKind, 0, height + 0.2, 0, w, d, kind === "slate-mansard" ? 4.3 : 4.8, roofMat, facade);
    if (kind === "cross-gable") roof(house, "cross-gable", -w * 0.27, height + 0.25, 3, 6.2, 11, 3.4, redRoof, facade);
    if (kind === "rendered-pavillon") {
      block(house, ivory, w * 0.27, 1.45, d / 2 + 1.05, 4.5, 2.9, 2.1);
      block(house, glass, w * 0.27, 1.5, d / 2 + 2.12, 3.9, 2.2, 0.1);
      block(house, slate, w * 0.27, 3.02, d / 2 + 1.05, 4.8, 0.18, 2.4);
    }
    block(house, brick, -w * 0.28, height + 3.1, -d * 0.24, 0.8, 4.6, 0.9);
    block(house, ivory, -w * 0.28, height + 5.42, -d * 0.24, 1.1, 0.2, 1.2);
    block(plot, garden, 0, -0.035, 0, 20.2, 0.1, 23);
    block(plot, paving, 0, 0.035, 10.25, 2.7, 0.04, 2.5);
    for (const x of [-9.7, 9.7]) block(plot, hedge, x, 0.6, 0, 0.55, 1.2, 22);
    // Small adjoining plots: low stone walls, iron railings and a distinct entry gate.
    for (const x of [-10.1, 10.1]) {
      block(plot, stone, x, 0.48, 0, 0.28, 0.96, 23);
      block(plot, iron, x, 1.28, 0, 0.06, 0.07, 23);
      for (let z = -11.5; z <= 11.5; z += 0.6) block(plot, iron, x, 1.1, z, 0.035, 0.65, 0.035);
    }
    for (const x of [-6, 6]) {
      block(plot, stone, x, 0.48, 11.5, 8.2, 0.96, 0.28);
      block(plot, iron, x, 1.28, 11.5, 8.2, 0.07, 0.06);
      for (let dx = -4; dx <= 4; dx += 0.6) block(plot, iron, x + dx, 1.1, 11.5, 0.035, 0.65, 0.035);
    }
    block(plot, iron, 0, 0.8, 11.5, 3.5, 0.07, 0.06);
    for (let x = -1.7; x <= 1.7; x += 0.25) block(plot, iron, x, 0.8, 11.5, 0.035, 1.45, 0.035);
    plot.updateMatrix();
    for (const [x, z] of [[-7.7, 9.6], [6.2, -10.2]]) {
      const point = new THREE.Vector3(x, 0, z).applyMatrix4(plot.matrix); treeLocations.push([point.x, point.z]);
    }
  }
  neighborhood.add(createAutumnTrees(treeLocations, miniature));
  for (const batch of batches) {
    const mesh = new THREE.InstancedMesh(box, batch.material, batch.matrices.length);
    mesh.name = batch.material.name; mesh.castShadow = true; mesh.receiveShadow = true;
    batch.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix)); batch.parent.add(mesh);
  }
  return neighborhood;
}
