import * as THREE from "three";
import { HOME_GROUND_BOULEVARD, HOME_GROUND_PITCH } from "./homeGroundLayout";
import { createGoalNet } from "./createGoalNet";
import { createCherryTrees } from "./createCherryTrees";
import { createHomeGroundNeighborhood } from "./createHomeGroundNeighborhood";

/** Static goal for the menu and thumbnail; the match owns its interactive goal. */
export function createHomeGroundGoal() {
  const goal = new THREE.Group();
  goal.name = "home-ground-practice-goal";
  goal.position.z = HOME_GROUND_PITCH.nearZ;
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff }), 3);
  const transform = new THREE.Object3D();
  [[-3.66, 1.22, 0.16, 2.44], [3.66, 1.22, 0.16, 2.44], [0, 2.44, 7.48, 0.16]].forEach(([x, y, w, h], i) => {
    transform.position.set(x, y, 0); transform.scale.set(w, h, 0.16); transform.updateMatrix(); posts.setMatrixAt(i, transform.matrix);
  });
  goal.add(posts, createGoalNet().group);
  return goal;
}

/** The sketch sets the site plan; the scale model supplies the villa architecture.
 *  The compact court keeps the same goal and penalty spot as gameplay.
 */
export function createHomeGround(miniature = false) {
  const site = new THREE.Group();
  site.name = "home-ground";
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 7);
  const mat = (name: string, color: number, roughness = 0.9) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness });
    material.name = name;
    return material;
  };
  const cream = mat("warm-ivory-stone", 0xffedcc);
  const yellow = mat("front-villa-yellow-stucco", 0xf5e7bd);
  const paleYellow = mat("rear-residence-pale-yellow-stucco", 0xf8edcf);
  const roof = mat("red-terracotta-roof-tiles", 0x9e4938);
  roof.side = THREE.DoubleSide;
  const tileEdge = mat("terracotta-tile-joints", 0xbd6b50);
  const brick = mat("red-corner-quoins-and-balconies", 0xb65c45);
  const green = mat("sage-green-window-shutters", 0x64855c);
  const darkGreen = mat("green-shutter-louvres", 0x405d3f);
  const glass = mat("blue-gray-window-glass", 0x57777a, 0.3);
  const metal = mat("garden-fence-green", 0x3c5144);
  const wood = mat("carport-natural-timber", 0x8c6846);
  const road = mat("parking-asphalt", 0x858889);
  const paving = mat("ivory-garden-paving", 0xcec6ad);
  const white = mat("parking-lines-and-goalposts", 0xf8f4e6);
  const earth = mat("spring-garden-ground", 0x8b9c72);
  const hedge = mat("trimmed-garden-hedges", 0x526c39);
  const transform = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const batches: { parent: THREE.Group; geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[] }[] = [];
  const add = (parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material,
    x: number, y: number, z: number, w: number, h: number, d: number, rotation?: THREE.Euler) => {
    let batch = batches.find(entry => entry.parent === parent && entry.geometry === geometry && entry.material === material);
    if (!batch) { batch = { parent, geometry, material, matrices: [] }; batches.push(batch); }
    transform.position.set(x, y, z);
    transform.rotation.copy(rotation ?? new THREE.Euler());
    transform.scale.set(w, h, d);
    transform.updateMatrix();
    batch.matrices.push(transform.matrix.clone());
  };
  const block = (parent: THREE.Group, material: THREE.Material,
    x: number, y: number, z: number, w: number, h: number, d: number, rotation?: THREE.Euler) =>
    add(parent, box, material, x, y, z, w, h, d, rotation);
  const beam = (parent: THREE.Group, material: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, thickness: number) => {
    const direction = b.clone().sub(a);
    const center = a.clone().add(b).multiplyScalar(0.5);
    const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize()));
    block(parent, material, center.x, center.y, center.z, thickness, direction.length(), thickness, rotation);
  };
  const group = (name: string, parent = site) => {
    const result = new THREE.Group(); result.name = name; parent.add(result); return result;
  };

  // True hipped roofs, with a ridge along the long axis and tile courses on all four slopes.
  const hippedRoof = (parent: THREE.Group, x: number, y: number, z: number, width: number, depth: number, rise: number) => {
    const longZ = depth > width;
    const a = Math.max(width, depth) / 2, b = Math.min(width, depth) / 2;
    const ridge = Math.max(0.15, a - b * 0.85);
    const p = (u: number, height: number, v: number) => new THREE.Vector3(x + (longZ ? v : u), y + height, z + (longZ ? u : v));
    const corners = [p(-a, 0, -b), p(a, 0, -b), p(a, 0, b), p(-a, 0, b)];
    const left = p(-ridge, rise, 0), right = p(ridge, rise, 0);
    const faces = [
      [corners[0], corners[1], right, left], [corners[2], corners[3], left, right],
      [corners[3], corners[0], left, left], [corners[1], corners[2], right, right],
    ];
    const vertices: number[] = [];
    for (const [a, b, c, d] of faces) {
      for (const point of [a, b, c, a, c, d]) vertices.push(point.x, point.y, point.z);
      const courses = Math.ceil(Math.hypot(rise, Math.min(width, depth) / 2) / 0.38);
      for (let row = 1; row < courses; row++) {
        const t = row / courses;
        const start = a.clone().lerp(d, t), end = b.clone().lerp(c, t);
        start.y += 0.025; end.y += 0.025;
        beam(parent, tileEdge, start, end, 0.035);
        // Short staggered seams read as individual tiles without a texture download.
        if (!miniature) {
          const count = Math.floor(start.distanceTo(end) / 0.56);
          for (let seam = 1; seam < count; seam++) {
            const u = (seam + row % 2 * 0.45) / count;
            const bottom = start.clone().lerp(end, u);
            const top = a.clone().lerp(d, (row + 1) / courses).lerp(b.clone().lerp(c, (row + 1) / courses), u);
            top.y += 0.025;
            beam(parent, tileEdge, bottom, top, 0.018);
          }
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, roof);
    mesh.name = "hipped-red-tile-roof"; mesh.castShadow = true;
    parent.add(mesh);
    beam(parent, brick, left, right, 0.16);
    for (let i = 0; i < 4; i++) beam(parent, brick, corners[i], i === 0 || i === 3 ? left : right, 0.11);
    block(parent, cream, x, y - 0.13, z, width, 0.24, depth);
  };

  // A broad triangular front gable, with just two roof slopes and an obtuse apex.
  const gabledRoof = (parent: THREE.Group, x: number, y: number, z: number, width: number, depth: number) => {
    const halfWidth = width / 2 + 0.625, halfDepth = depth / 2 + 0.625;
    const rise = Math.min(width * 0.12, depth * 0.32);
    const vertices: number[] = [];
    for (const side of [-1, 1]) {
      const eaveFront = new THREE.Vector3(x + side * halfWidth, y, z + halfDepth);
      const eaveBack = new THREE.Vector3(x + side * halfWidth, y, z - halfDepth);
      const ridgeFront = new THREE.Vector3(x, y + rise, z + halfDepth);
      const ridgeBack = new THREE.Vector3(x, y + rise, z - halfDepth);
      const points = [eaveFront, eaveBack, ridgeBack, eaveFront, ridgeBack, ridgeFront];
      for (const point of points) vertices.push(point.x, point.y, point.z);
      const courses = Math.ceil(Math.hypot(halfWidth, rise) / 0.4);
      for (let row = 1; row < courses; row++) {
        const a = eaveFront.clone().lerp(ridgeFront, row / courses);
        const b = eaveBack.clone().lerp(ridgeBack, row / courses);
        a.y += 0.025; b.y += 0.025;
        beam(parent, tileEdge, a, b, 0.035);
        if (!miniature) for (let seam = 0.5 + row % 2 * 0.28; seam < depth + 1.25; seam += 0.56) {
          const bottom = a.clone().lerp(b, seam / (depth + 1.25));
          const top = eaveFront.clone().lerp(ridgeFront, (row + 1) / courses)
            .lerp(eaveBack.clone().lerp(ridgeBack, (row + 1) / courses), seam / (depth + 1.25));
          top.y += 0.025;
          beam(parent, tileEdge, bottom, top, 0.018);
        }
      }
      beam(parent, brick, eaveFront, ridgeFront, 0.13);
      beam(parent, brick, eaveBack, ridgeBack, 0.13);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, roof);
    mesh.name = "obtuse-gable-red-tile-roof"; mesh.castShadow = true;
    parent.add(mesh);
    beam(parent, brick, new THREE.Vector3(x, y + rise, z - halfDepth), new THREE.Vector3(x, y + rise, z + halfDepth), 0.17);
    // The entire triangular face is terracotta, including its interior.
    const gableVertices: number[] = [];
    for (const sign of [-1, 1]) {
      const faceZ = z + sign * (depth / 2 + 0.015);
      const left = [x - width / 2, y - 0.22, faceZ], right = [x + width / 2, y - 0.22, faceZ];
      gableVertices.push(...(sign === 1 ? left : right), ...(sign === 1 ? right : left), x, y + rise - 0.035, faceZ);
      const faceHeight = rise + 0.185;
      const rows = Math.ceil(faceHeight / 0.28);
      for (let row = 1; row < rows; row++) {
        const fraction = row / rows;
        const halfSpan = width / 2 * (1 - fraction);
        const courseY = y - 0.22 + faceHeight * fraction;
        const tileZ = faceZ + sign * 0.025;
        beam(parent, tileEdge, new THREE.Vector3(x - halfSpan, courseY, tileZ), new THREE.Vector3(x + halfSpan, courseY, tileZ), 0.025);
        if (!miniature) {
          const nextHalfSpan = width / 2 * (1 - (row + 1) / rows);
          for (let seamX = -halfSpan + 0.3 + row % 2 * 0.26; seamX < halfSpan; seamX += 0.56) {
            const t = Math.min(1, (halfSpan - Math.abs(seamX)) / Math.max(0.001, halfSpan - nextHalfSpan));
            if (t > 0) beam(parent, tileEdge, new THREE.Vector3(x + seamX, courseY, tileZ),
              new THREE.Vector3(x + seamX, courseY + faceHeight / rows * t, tileZ), 0.016);
          }
        }
      }
    }
    const gableGeometry = new THREE.BufferGeometry();
    gableGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gableVertices, 3)); gableGeometry.computeVertexNormals();
    const gable = new THREE.Mesh(gableGeometry, roof); gable.name = "triangular-red-tile-gable";
    parent.add(gable);
    block(parent, cream, x, y - 0.13, z, width + 1.25, 0.24, depth + 1.25);
  };

  const villa = (parent: THREE.Group, x: number, z: number, width: number, depth: number, floors: number, facade: THREE.Material,
    style: "villa" | "rear-residence" = "villa") => {
    const height = floors * 3.15;
    block(parent, facade, x, height / 2, z, width, height, depth);
    block(parent, cream, x, 0.28, z, width + 0.18, 0.56, depth + 0.18);
    for (let floor = 1; floor < floors; floor++) block(parent, cream, x, floor * 3.15, z, width + 0.15, 0.16, depth + 0.15);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      for (let row = 0; row < height / 0.48; row++) {
        block(parent, row % 2 ? cream : brick, x + sx * (width / 2 - 0.23), 0.26 + row * 0.48,
          z + sz * (depth / 2 - 0.05), 0.54, 0.3, 0.22);
        block(parent, row % 2 ? cream : brick, x + sx * (width / 2 + 0.05), 0.26 + row * 0.48,
          z + sz * (depth / 2 - 0.23), 0.22, 0.3, 0.54);
      }
    }
    // Local facade coordinates also cover the side elevations, visible in the flyover.
    const window = (wx: number, wy: number, wz: number, yaw: number, balcony: boolean) => {
      const place = (material: THREE.Material, u: number, v: number, out: number, w: number, h: number, d: number) =>
        block(parent, material, wx + Math.cos(yaw) * u + Math.sin(yaw) * out, wy + v,
          wz - Math.sin(yaw) * u + Math.cos(yaw) * out, w, h, d, new THREE.Euler(0, yaw, 0));
      place(cream, 0, 0, 0.05, 1.75, 2.15, 0.2);
      place(glass, 0, 0, 0.17, 1.38, 1.83, 0.08);
      place(cream, 0, 0, 0.23, 0.065, 1.9, 0.07);
      place(cream, 0, 0.05, 0.23, 1.4, 0.055, 0.07);
      for (const side of [-1, 1]) {
        place(green, side * 1.02, 0, 0.14, 0.55, 1.98, 0.13);
        for (let slat = 0; slat < 6; slat++) place(darkGreen, side * 1.02, -0.76 + slat * 0.3, 0.22, 0.43, 0.045, 0.035);
      }
      place(cream, 0, -1.1, 0.23, 1.95, 0.13, 0.48);
      if (balcony) {
        place(cream, 0, -1.23, 0.75, 2.95, 0.2, 1.55);
        place(brick, 0, -0.91, 1.45, 2.8, 0.38, 0.1);
        place(cream, 0, -0.32, 1.45, 2.95, 0.09, 0.1);
        for (let bar = 0; bar < 9; bar++) place(metal, -1.35 + bar * 0.3375, -0.57, 1.44, 0.035, 0.58, 0.035);
        for (const side of [-1, 1]) {
          place(metal, side * 1.4, -0.32, 0.75, 0.06, 0.09, 1.4);
          place(metal, side * 1.4, -0.73, 0.75, 0.04, 0.82, 0.04);
          place(hedge, side * 0.95, -0.83, 0.93, 0.48, 0.46, 0.38);
        }
      }
    };
    for (let floor = 0; floor < floors; floor++) {
      const columns = Math.max(1, Math.floor(width / 7.5));
      for (let column = 0; column < columns; column++) for (const sign of [-1, 1]) {
        const offset = (column - (columns - 1) / 2) * width / columns;
        window(x + offset, floor * 3.15 + 1.65, z + sign * (depth / 2 + 0.03), sign === 1 ? 0 : Math.PI,
          floor > 0 && (style === "rear-residence" || column % 3 !== 1));
      }
      const sideColumns = Math.max(1, Math.floor(depth / 7));
      for (let column = 0; column < sideColumns; column++) for (const sign of [-1, 1]) {
        window(x + sign * (width / 2 + 0.03), floor * 3.15 + 1.65,
          z + (column - (sideColumns - 1) / 2) * depth / sideColumns, sign * Math.PI / 2, floor > 0 && style === "rear-residence");
      }
    }
    if (style === "rear-residence") gabledRoof(parent, x, height + 0.2, z, width, depth);
    else hippedRoof(parent, x, height + 0.2, z, width + 1.25, depth + 1.25, Math.min(width, depth) * 0.28);
    block(parent, cream, x + width * 0.23, height + 2, z - depth * 0.13, 0.8, 3.4, 0.8);
    block(parent, cream, x + width * 0.23, height + 3.75, z - depth * 0.13, 1.1, 0.23, 1.1);
  };

  const rear = group("home-ground-rear-residence");
  // Three staggered, connected wings, rather than one generic building box.
  villa(rear, 0, -21, 39, 13, 2, paleYellow, "rear-residence");
  villa(rear, -15, -33, 15, 12, 2, paleYellow, "rear-residence");
  villa(rear, 11, -37, 39, 13, 2, paleYellow, "rear-residence");
  const front = group("home-ground-front-two-storey-villa");
  villa(front, 0, 43, 29, 15, 2, yellow);
  // Projecting end pavilions produce the intersecting roofs of the reference.
  villa(front, -11, 45, 8, 19, 2, yellow);
  villa(front, 11, 45, 8, 19, 2, yellow);
  block(front, cream, 0, 0.18, 33.8, 7, 0.36, 3.3);
  block(front, wood, 0, 1.4, 35.4, 1.75, 2.8, 0.2);
  block(front, cream, 0, 3, 34.6, 3.1, 0.25, 1.9);
  for (const x of [-1.25, 1.25]) block(front, cream, x, 1.5, 33.8, 0.22, 2.8, 0.22);

  const landscape = group("home-ground-gardens");
  // Leave an actual opening in the terrain for the descending driveway.
  const halfWidth = miniature ? 82 : 500, halfDepth = miniature ? 74 : 500;
  const terrain = new THREE.Shape();
  terrain.moveTo(-halfWidth, -18 - halfDepth);
  terrain.lineTo(halfWidth, -18 - halfDepth);
  terrain.lineTo(halfWidth, -18 + halfDepth);
  terrain.lineTo(-halfWidth, -18 + halfDepth);
  terrain.closePath();
  const cutout = new THREE.Path();
  cutout.moveTo(23.1, 11); cutout.lineTo(23.1, -27);
  cutout.lineTo(32.4, -27); cutout.lineTo(32.4, 11); cutout.closePath();
  terrain.holes.push(cutout);
  const lawn = new THREE.Mesh(new THREE.ShapeGeometry(terrain), earth);
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = -0.18;
  lawn.receiveShadow = true;
  landscape.add(lawn);
  block(landscape, earth, 27.7, -1.5, 8, 9.4, 0.1, 39);
  // Paving forms a frame outside the grass; no overlapping surfaces at the apron edge.
  const field = HOME_GROUND_PITCH;
  const fieldCenter = (field.nearZ + field.farZ) / 2;
  const pathX = field.apronWidth / 2 + 1.2;
  for (const x of [-pathX, pathX]) block(landscape, paving, x, -0.015, fieldCenter, 2, 0.09, field.apronDepth + 4);
  for (const side of [-1, 1]) block(landscape, paving, 0, -0.015, fieldCenter + side * (field.apronDepth / 2 + 1.2), field.apronWidth, 0.09, 2);

  const parking = group("home-ground-front-parking");
  block(parking, road, 0, 0.025, 25, 43, 0.12, 15);
  for (let x = -18; x <= 18; x += 3.6) block(parking, white, x, 0.091, 22.5, 0.09, 0.015, 5.5);
  block(parking, white, 0, 0.091, 19.75, 36, 0.015, 0.1);
  block(parking, paving, 0, 0.12, 33, 43, 0.22, 1.4);
  const leftParking = group("home-ground-left-parking");
  block(leftParking, road, -28, 0.025, 5, 19, 0.12, 32);
  for (let z = -8; z <= 18; z += 3.5) {
    block(leftParking, white, -32, 0.091, z, 5, 0.015, 0.09);
    block(leftParking, white, -23, 0.091, z, 4, 0.015, 0.09);
  }
  for (const x of [-38.5, -17.5]) block(leftParking, hedge, x, 0.45, 5, 0.8, 0.85, 33);
  block(leftParking, paving, -28, 0.12, -11.5, 22, 0.24, 1.2);

  const gray = mat("gray-car-body", 0x8a8e91, 0.35);
  const rubber = mat("car-tires", 0x272c2d);
  const carPaint = [gray, mat("parked-car-blue", 0x496c81, 0.35), mat("parked-car-ivory", 0xe5e1d5, 0.35), mat("parked-car-burgundy", 0x874e48, 0.35)];
  const parkCar = (parent: THREE.Group, name: string, x: number, y: number, z: number, color: THREE.Material, yaw = 0) => {
    const car = group(name, parent);
    car.userData.parkedCar = true;
    car.position.set(x, y, z); car.rotation.y = yaw;
    block(car, color, 0, 0.62, 0, 1.9, 0.65, 4.1);
    block(car, glass, 0, 1.13, -0.15, 1.66, 0.66, 2.1);
    block(car, color, 0, 1.48, -0.15, 1.7, 0.12, 2.12);
    for (const x of [-0.82, 0, 0.82]) block(car, color, x, 1.14, -0.15, 0.08, 0.7, 2.12);
    for (const x of [-0.97, 0.97]) for (const z of [-1.25, 1.25]) {
      add(car, cylinder, rubber, x, 0.38, z, 0.34, 0.2, 0.34, new THREE.Euler(0, 0, Math.PI / 2));
      add(car, cylinder, cream, x * 1.015, 0.38, z, 0.17, 0.21, 0.17, new THREE.Euler(0, 0, Math.PI / 2));
    }
    for (const x of [-0.62, 0.62]) {
      block(car, white, x, 0.74, 2.06, 0.38, 0.2, 0.05);
      block(car, brick, x, 0.74, -2.06, 0.4, 0.2, 0.05);
    }
  };
  parkCar(parking, "home-ground-gray-parked-car", 5.4, 0.05, 22.7, gray);
  [-16.2, -9, 12.6].forEach((x, i) => parkCar(parking, `front-parking-car-${i + 1}`, x, 0.05, 22.7, carPaint[i + 1], i % 2 ? Math.PI : 0));
  [[-32, -6.25], [-32, 4.25], [-23, 0.75], [-23, 14.75]].forEach(([x, z], i) =>
    parkCar(leftParking, `left-parking-car-${i + 1}`, x, 0.05, z, carPaint[i], x === -32 ? Math.PI / 2 : -Math.PI / 2));

  const driveway = group("home-ground-descending-driveway");
  // The right approach descends to a lower covered parking bay, then rejoins the front lot.
  block(driveway, road, 27.5, -0.57, 5.5, 7.8, 0.14, 33, new THREE.Euler(0.036, 0, 0));
  block(driveway, road, 27.5, -0.57, 24, 7.8, 0.14, 6, new THREE.Euler(-0.2, 0, 0));
  block(driveway, road, 22, 0.025, 28, 17, 0.12, 6);
  for (const x of [23.2, 31.8]) block(driveway, cream, x, -0.12, 8, 0.36, 1.1, 38);
  block(driveway, road, 28.5, 0.025, 44, 6, 0.12, 34);
  const carport = group("home-ground-wooden-covered-parking", driveway);
  for (const x of [24.2, 30.6]) for (const z of [9, 15, 21]) {
    block(carport, wood, x, 0.72, z, 0.23, 3.6, 0.23);
  }
  for (const x of [24.2, 30.6]) block(carport, wood, x, 2.48, 15, 0.25, 0.34, 14.2);
  for (let z = 8; z <= 22; z += 0.62) block(carport, wood, 27.4, 2.68, z, 7, 0.18, 0.31);
  block(carport, wood, 27.4, 2.84, 15, 7.2, 0.11, 14.6);
  for (let z = 8; z <= 22; z += 0.45) block(carport, tileEdge, 27.4, 2.91, z, 7.2, 0.025, 0.025);
  block(carport, hedge, 27.4, 2.99, 15, 5.8, 0.18, 12.5);
  for (const [i, z] of [11.7, 17.7].entries()) {
    const roadHeight = -0.57 + 0.07 - Math.sin(0.036) * (z - 5.5);
    parkCar(carport, `covered-parking-car-${i + 1}`, 27.4, roadHeight - 0.04, z, carPaint[i + 1]);
  }

  // Low, fine-mesh garden fences, with an open view of the homes from the pitch.
  const fences = group("home-ground-garden-fences");
  const fenceX = field.apronWidth / 2 + 2.4;
  const backFence = fieldCenter - field.apronDepth / 2 - 1.5, frontFence = fieldCenter + field.apronDepth / 2 + 1.5;
  for (const x of [-fenceX, fenceX]) {
    for (let z = backFence; z <= frontFence; z += 2.5) block(fences, metal, x, 0.65, z, 0.07, 1.3, 0.07);
    for (const y of [0.4, 1.25]) block(fences, metal, x, y, fieldCenter, 0.035, 0.035, frontFence - backFence);
    for (let z = backFence; z <= frontFence; z += 0.32) block(fences, metal, x, 0.67, z, 0.022, 1.2, 0.022);
  }
  for (const z of [backFence, frontFence]) {
    block(fences, metal, 0, 1.25, z, fenceX * 2, 0.045, 0.045);
    for (let x = -fenceX; x <= fenceX; x += 0.45) block(fences, metal, x, 0.63, z, 0.025, 1.25, 0.025);
  }
  const gardenBorders = group("home-ground-private-garden-borders");
  for (const side of [-1, 1]) {
    block(gardenBorders, hedge, side * (fenceX + 0.55), 0.28, fieldCenter, 0.7, 0.7, field.apronDepth + 3);
    block(gardenBorders, hedge, side * 8.8, 0.28, 15.8, 5, 0.7, 1.1);
  }
  // A small timber bench reinforces the scale of a private garden beside the parking.
  for (const x of [-1.25, 1.25]) block(gardenBorders, metal, x, 0.21, 15.6, 0.1, 0.65, 0.65);
  for (let slat = 0; slat < 4; slat++) block(gardenBorders, wood, 0, 0.55, 15.3 + slat * 0.17, 3.2, 0.09, 0.13);
  for (let slat = 0; slat < 3; slat++) block(gardenBorders, wood, 0, 0.8 + slat * 0.18, 15.94, 3.2, 0.12, 0.09);
  const locations = [[-6.5, -10.5], [0, -10.5], [6.5, -10.5], [-15.8, -5], [-15.8, 6], [-15.8, 16],
    [-36, -6], [-36, 7], [-36, 18], [18, -10], [-19, -11], [-19, 32], [19, 32], [-19, 55], [20, 55]];
  site.add(createCherryTrees(locations, miniature));
  // Residence boundary, distinct from the small pitch fence, with a driveway gate.
  const boundary = group("home-ground-residence-boundary");
  const wall = (parent: THREE.Group, x: number, z: number, w: number, d: number) => {
    block(parent, cream, x, 0.6, z, w, 1.2, d);
    block(parent, metal, x, 1.55, z, w, 0.08, d);
    const length = Math.max(w, d);
    for (let offset = -length / 2; offset <= length / 2; offset += 0.65) {
      block(parent, metal, x + (w > d ? offset : 0), 1.32, z + (d > w ? offset : 0), 0.045, 0.6, 0.045);
    }
  };
  wall(boundary, -41, 6, 0.4, 104); wall(boundary, 36, 6, 0.4, 104);
  wall(boundary, -2.5, -46, 77, 0.4);
  wall(boundary, -8, 58, 66, 0.4); wall(boundary, 34.5, 58, 3, 0.4);
  for (const x of [25, 32]) block(boundary, cream, x, 1.05, 58, 0.65, 2.1, 0.65);

  const boulevard = group("home-ground-boulevard");
  const { centerZ: boulevardZ, halfLength, roadWidth } = HOME_GROUND_BOULEVARD;
  const streetLength = miniature ? 164 : halfLength * 2;
  const street = mat("boulevard-asphalt", 0x5d6265);
  block(boulevard, street, 0, -0.02, boulevardZ, streetLength, 0.14, roadWidth);
  for (const side of [-1, 1]) {
    block(boulevard, paving, 0, 0.045, boulevardZ + side * 7.2, streetLength, 0.2, 2.4);
    block(boulevard, cream, 0, 0.06, boulevardZ + side * 6.05, streetLength, 0.25, 0.18);
  }
  for (let x = -streetLength / 2 + 3; x < streetLength / 2; x += 7) block(boulevard, white, x, 0.058, boulevardZ, 3.5, 0.015, 0.12);
  for (let z = boulevardZ - 5; z <= boulevardZ + 5; z += 1.3) block(boulevard, white, 28.5, 0.061, z, 3.8, 0.02, 0.65);
  // Curb cut joins the residence access road across the north sidewalk.
  block(boulevard, road, 28.5, 0.16, 59.2, 6.2, 0.05, 3.2);

  site.add(createHomeGroundNeighborhood(miniature));
  // Side streets connect the maison plots to the boulevard outside the residence walls.
  const sideStreets = group("home-ground-residential-side-streets");
  for (const x of [-45.5, 41]) block(sideStreets, street, x, -0.025, 8, 5.5, 0.12, 104);

  for (const batch of batches) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    mesh.name = batch.material.name;
    batch.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.castShadow = batch.material !== earth && batch.material !== paving && batch.material !== road;
    mesh.receiveShadow = true;
    batch.parent.add(mesh);
  }
  site.traverse(object => { object.updateMatrix(); object.matrixAutoUpdate = false; });
  return site;
}
