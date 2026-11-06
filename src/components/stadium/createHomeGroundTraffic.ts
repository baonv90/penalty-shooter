import * as THREE from "three";
import { HOME_GROUND_BOULEVARD } from "./homeGroundLayout";

/** Two-way boulevard traffic; all vehicles reuse six instanced draw calls. */
export function createHomeGroundTraffic() {
  const group = new THREE.Group();
  group.name = "home-ground-boulevard-traffic";
  const count = 10;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const paint = new THREE.MeshStandardMaterial({ roughness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x324851, roughness: 0.3 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x282c2e });
  const light = new THREE.MeshBasicMaterial({ color: 0xffedc4 });
  const batch = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, instances: number) => {
    const mesh = new THREE.InstancedMesh(geometry, material, instances);
    mesh.name = name; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh); return mesh;
  };
  const bodies = batch("boulevard-car-bodies", box, paint, count);
  const cabins = batch("boulevard-car-windows", box, glass, count);
  const roofs = batch("boulevard-car-roofs", box, paint, count);
  const pillars = batch("boulevard-car-pillars", box, paint, count * 4);
  const wheels = batch("boulevard-car-wheels", new THREE.CylinderGeometry(0.32, 0.32, 0.19, 8), rubber, count * 4);
  const lights = batch("boulevard-car-lights", box, light, count * 2);
  const colors = [0xb05848, 0xd9d6cd, 0x577c8c, 0x686d72, 0xbda777];
  for (let i = 0; i < count; i++) {
    const color = new THREE.Color(colors[i % colors.length]);
    bodies.setColorAt(i, color); roofs.setColorAt(i, color);
    for (let part = 0; part < 4; part++) pillars.setColorAt(i * 4 + part, color);
  }
  const parent = new THREE.Object3D(), part = new THREE.Object3D();
  const write = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, w: number, h: number, d: number, roll = 0) => {
    part.position.set(x, y, z); part.rotation.set(0, 0, roll); part.scale.set(w, h, d); part.updateMatrix();
    mesh.setMatrixAt(index, part.matrix.premultiply(parent.matrix));
  };
  const { centerZ, halfLength, laneOffset } = HOME_GROUND_BOULEVARD;
  let elapsed = 0;
  const update = (delta: number, active: boolean) => {
    group.visible = active;
    if (!active) return;
    elapsed += delta;
    for (let i = 0; i < count; i++) {
      const direction = i % 2 ? 1 : -1;
      const distance = -halfLength + i * halfLength * 2 / count + elapsed * direction * (7 + i % 3);
      const x = ((distance + halfLength) % (halfLength * 2) + halfLength * 2) % (halfLength * 2) - halfLength;
      // Right-hand traffic: the south lane heads east and the north lane heads west.
      parent.position.set(x, 0.06, centerZ + direction * laneOffset);
      parent.rotation.set(0, direction * Math.PI / 2, 0); parent.updateMatrix();
      write(bodies, i, 0, 0.62, 0, 1.85, 0.65, 4.1);
      write(cabins, i, 0, 1.15, -0.1, 1.6, 0.6, 2.05);
      write(roofs, i, 0, 1.48, -0.1, 1.66, 0.1, 2.1);
      for (let p = 0; p < 4; p++) {
        write(pillars, i * 4 + p, p % 2 ? 0.8 : -0.8, 1.15, p < 2 ? -1.1 : 0.9, 0.07, 0.62, 0.09);
        write(wheels, i * 4 + p, p % 2 ? 0.94 : -0.94, 0.34, p < 2 ? -1.25 : 1.25, 1, 1, 1, Math.PI / 2);
      }
      for (let p = 0; p < 2; p++) write(lights, i * 2 + p, p ? 0.62 : -0.62, 0.73, 2.065, 0.36, 0.19, 0.05);
    }
    for (const object of group.children) (object as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
  };
  update(0, true);
  return { group, update };
}
