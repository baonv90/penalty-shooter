import * as THREE from "three";
import { createRoadRoute } from "./stadiumRoads";
import { StadiumId } from "../../constants/stadiums";
import { createStadiumRailway } from "./createStadiumRailway";

/** Shared traffic and arrivals for the home loop and match entrance. */
export function createStadiumActivity(homeColor: number, awayColor: number, stadiumId: StadiumId = "arena") {
  const group = new THREE.Group();
  group.name = "stadium-arrivals-and-traffic";
  const railway = stadiumId === "stamford-bridge" ? createStadiumRailway() : null;
  if (railway) group.add(railway.group);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const painted = new THREE.MeshStandardMaterial({ roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x17212e, roughness: 0.6 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8ba92, roughness: 1 });
  const batch = (geometry: THREE.BufferGeometry, material: THREE.Material, count: number) => {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Instance transforms move beyond their initial positions; avoid stale culling bounds.
    mesh.frustumCulled = false;
    if (count > 0) group.add(mesh);
    return mesh;
  };
  const fanCount = stadiumId === "stamford-bridge" ? 240 : stadiumId === "san-siro" ? 120 : 72;
  const bodies = batch(box, painted, fanCount);
  bodies.name = "arriving-supporters";
  const heads = batch(new THREE.SphereGeometry(0.17, 8, 6), skin, fanCount);
  const legs = batch(box, dark, fanCount * 2);
  const arms = batch(box, painted, fanCount * 2);
  const carCount = railway ? 0 : 16;
  const cars = batch(box, painted, carCount);
  cars.name = "stadium-road-traffic";
  const cabins = batch(box, dark, carCount);
  const wheels = batch(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 8), dark, carCount * 4);
  const dynamicMeshes = [bodies, heads, legs, arms, cars, cabins, wheels];
  const color = new THREE.Color();
  const carColors = [0xf4b942, homeColor, awayColor, 0xe2e8f0, 0x54a89c];
  for (let i = 0; i < fanCount; i++) {
    color.setHex(i % 5 < 3 ? homeColor : awayColor);
    bodies.setColorAt(i, color);
    arms.setColorAt(i * 2, color);
    arms.setColorAt(i * 2 + 1, color);
  }
  for (let i = 0; i < carCount; i++) cars.setColorAt(i, color.setHex(carColors[i % carColors.length]));
  const parent = new THREE.Object3D();
  const part = new THREE.Object3D();
  const write = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number,
    sx: number, sy: number, sz: number, tilt = 0, roll = 0) => {
    part.position.set(x, y, z);
    part.rotation.set(tilt, 0, roll);
    part.scale.set(sx, sy, sz);
    part.updateMatrix();
    part.matrix.premultiply(parent.matrix);
    mesh.setMatrixAt(index, part.matrix);
  };
  const wrap = (value: number, range: number) => ((value % range) + range) % range;
  const routes = [createRoadRoute(-1.7), createRoadRoute(1.7)];
  const routeLengths = routes.map(route => route.getLength());
  const roadPoint = new THREE.Vector2();
  const roadDirection = new THREE.Vector2();
  const pedestrianRoutes = [-2, 0, 2].map(lane => createRoadRoute(-7 + lane));
  const pedestrianLengths = pedestrianRoutes.map(route => route.getLength());
  let elapsed = 0;
  const update = (delta: number, active: boolean) => {
    group.visible = active;
    if (!active) return;
    elapsed += delta;
    railway?.update(elapsed);
    for (let i = 0; i < fanCount; i++) {
      const side = i % 2 ? 1 : -1;
      const gateZ = i % 4 < 2 ? 0 : 36;
      const progress = wrap(i * 0.137 + elapsed * (0.023 + i % 3 * 0.003), 1);
      const startZ = gateZ + (i % 3 - 1) * 24 + (i % 7 - 3) * 1.5;
      const approach = Math.min(progress / 0.7, 1);
      const entry = Math.max(0, (progress - 0.7) / 0.3);
      const fromStation = railway && side === 1;
      const lane = (Math.floor(i / 4) % 5 - 2) * 0.45;
      const gateX = stadiumId === "san-siro" || stadiumId === "stamford-bridge" ? 42 : 36;
      const x = fromStation ? THREE.MathUtils.lerp(61.5, gateX, progress) + lane : side * (46.5 - entry * (46.5 - gateX)) + lane;
      const z = THREE.MathUtils.lerp(startZ, gateZ, approach);
      const walk = Math.sin(elapsed * 8 + i * 2);
      const platformHeight = fromStation ? THREE.MathUtils.clamp((x - 58) / 2, 0, 1) : 0;
      if (railway && i % 4 !== 1) {
        // Fans circulate on all four sides, entirely within the paved lanes.
        const routeIndex = i % pedestrianRoutes.length;
        const direction = i % 2 ? 1 : -1;
        const distance = wrap(i * 0.137 + elapsed * direction * 1.3 / pedestrianLengths[routeIndex], 1);
        pedestrianRoutes[routeIndex].getPointAt(distance, roadPoint);
        pedestrianRoutes[routeIndex].getTangentAt(distance, roadDirection);
        parent.position.set(roadPoint.x, 0.08 + Math.abs(walk) * 0.035, roadPoint.y);
        parent.rotation.set(0, Math.atan2(roadDirection.x * direction, roadDirection.y * direction), 0);
      } else {
        parent.position.set(x, platformHeight + 0.08 + Math.abs(walk) * 0.035, z);
        parent.rotation.set(0, fromStation ? -Math.PI / 2 : progress < 0.7 ? Math.atan2(0, gateZ - startZ || 1) : -side * Math.PI / 2, 0);
      }
      parent.updateMatrix();
      write(bodies, i, 0, 0.88, 0, 0.38, 0.6, 0.24);
      write(heads, i, 0, 1.38, 0, 1, 1, 1);
      for (let limb = 0; limb < 2; limb++) {
        const sign = limb === 0 ? -1 : 1;
        write(legs, i * 2 + limb, sign * 0.11, 0.32, 0, 0.13, 0.55, 0.15, sign * walk * 0.4);
        write(arms, i * 2 + limb, sign * 0.27, 0.84, 0, 0.12, 0.5, 0.14, -sign * walk * 0.35);
      }
    }
    for (let i = 0; i < carCount; i++) {
      const direction = i % 2 ? 1 : -1;
      if (i < 12) {
        const lane = i % 2;
        const route = routes[lane];
        const progress = wrap(i / 12 + elapsed * direction * 7 / routeLengths[lane], 1);
        route.getPointAt(progress, roadPoint);
        route.getTangentAt(progress, roadDirection);
        parent.position.set(roadPoint.x, 0.04, roadPoint.y);
        parent.rotation.set(0, Math.atan2(roadDirection.x * direction, roadDirection.y * direction), 0);
      } else {
        // A few parked cars make the lots feel occupied without extra animation work.
        parent.position.set(railway ? -64 : i % 2 ? -64 : 64, 0, 18 + (i - 12) * 6);
        parent.rotation.set(0, Math.PI / 2, 0);
      }
      parent.updateMatrix();
      write(cars, i, 0, 0.6, 0, 1.7, 0.65, 3.3);
      write(cabins, i, 0, 1.1, -0.15, 1.35, 0.6, 1.7);
      for (let wheel = 0; wheel < 4; wheel++) {
        write(wheels, i * 4 + wheel, wheel % 2 ? 0.87 : -0.87, 0.3,
          wheel < 2 ? -1.05 : 1.05, 1, 1, 1, 0, Math.PI / 2);
      }
    }
    for (const mesh of dynamicMeshes) mesh.instanceMatrix.needsUpdate = true;
  };
  update(0, true);
  return { group, update };
}
