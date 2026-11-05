import * as THREE from "three";
import { createSanSiroBatch, createSanSiroRing } from "./sanSiroGeometry";

function createRoofPanel() {
  const positions: number[] = [];
  for (let section = 0; section < 12; section++) {
    const a = section / 12;
    const b = (section + 1) / 12;
    const points = [[0, Math.sin(a * Math.PI), a - 0.5], [1, Math.sin(a * Math.PI), a - 0.5],
      [0, Math.sin(b * Math.PI), b - 0.5], [1, Math.sin(b * Math.PI), b - 0.5]];
    for (const i of [0, 2, 1, 2, 3, 1]) positions.push(...points[i]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createSpiralRamp(radius: number, height: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  const segments = 480;
  const turns = height / 1.4;
  for (let i = 0; i <= segments; i++) {
    const angle = i / segments * Math.PI * 2 * turns;
    const y = 0.4 + i / segments * height;
    for (const r of [radius - 0.12, radius + 0.65]) positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
    if (i < segments) {
      const j = i * 2;
      indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Ribbed canopies, eleven spiral towers and the red steel superstructure in the references. */
export function createSanSiroRoof() {
  const { group, block, beam, finish } = createSanSiroBatch();
  group.name = "san-siro-roof";
  const concrete = new THREE.MeshStandardMaterial({ color: 0xbebcaf, roughness: 0.95, side: THREE.DoubleSide });
  const gray = new THREE.MeshStandardMaterial({ color: 0xaeb3b5, roughness: 0.85 });
  gray.name = "gray-concrete-canopy";
  const red = new THREE.MeshStandardMaterial({ color: 0xa52e36, roughness: 0.65, metalness: 0.25 });
  red.name = "san-siro-red-lattice-trusses";
  const core = new THREE.MeshStandardMaterial({ color: 0x565954, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c3437, roughness: 0.85 });
  const panels = new THREE.MeshStandardMaterial({ color: 0xbdc7be, roughness: 0.5, metalness: 0.12, side: THREE.DoubleSide });
  const fascia = new THREE.Mesh(createSanSiroRing(44, 50, 9, 1.2), gray);
  fascia.position.set(0, 25.2, 18);
  fascia.scale.y = 1.3;
  group.add(fascia);

  const panelMatrices: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  for (let side = 0; side < 4; side++) {
    const transverse = side >= 2;
    const sign = side % 2 ? 1 : -1;
    const length = transverse ? 44 : 100;
    const span = transverse ? 21 : 22;
    const count = Math.ceil(length / 2.6);
    for (let lane = 0; lane < count; lane++) {
      const along = -length / 2 + (lane + 0.5) * length / count;
      dummy.position.set(transverse ? along : sign * 22, 26.2, transverse ? 18 + sign * 29 : 18 + along);
      dummy.rotation.set(0, transverse ? -sign * Math.PI / 2 : sign < 0 ? Math.PI : 0, 0);
      dummy.scale.set(span, 0.8, length / count - 0.07);
      dummy.updateMatrix();
      panelMatrices.push(dummy.matrix.clone());
    }
  }
  const barrelPanels = new THREE.InstancedMesh(createRoofPanel(), panels, panelMatrices.length);
  barrelPanels.name = "ribbed-barrel-roof-panels";
  panelMatrices.forEach((matrix, index) => barrelPanels.setMatrixAt(index, matrix));
  group.add(barrelPanels);

  const truss = (axis: "x" | "z", fixed: number, length: number, bottom: number, height: number, thick: number) => {
    const point = (along: number, y: number, side: number) => axis === "x"
      ? new THREE.Vector3(along, y, fixed + side * 0.6)
      : new THREE.Vector3(fixed + side * 0.6, y, 18 + along);
    const bays = Math.ceil(length / 7);
    for (const face of [-1, 1]) {
      beam(red, point(-length / 2, bottom, face), point(length / 2, bottom, face), thick);
      beam(red, point(-length / 2, bottom + height, face), point(length / 2, bottom + height, face), thick);
      for (let bay = 0; bay < bays; bay++) {
        const a = -length / 2 + bay / bays * length;
        const b = -length / 2 + (bay + 1) / bays * length;
        beam(red, point(a, bottom, face), point(a, bottom + height, face), thick * 0.65);
        beam(red, point(a, bottom + (bay % 2 ? height : 0), face), point(b, bottom + (bay % 2 ? 0 : height), face), thick * 0.7);
        if (face === -1) beam(red, point(a, bottom + height, -1), point(a, bottom + height, 1), thick * 0.6);
      }
    }
  };
  for (const side of [-1, 1]) {
    truss("x", 18 + side * 47.5, 112, 27.2, 5.5, 0.42);
    truss("z", side * 41.5, 124, 27.2, 5.5, 0.42);
    truss("x", 18 + side * 34, 88, 27.4, 3, 0.24);
    truss("z", side * 28, 100, 27.4, 3, 0.24);
  }
  const endShape = new THREE.Shape();
  endShape.moveTo(0, 0); endShape.lineTo(9, -1.4); endShape.lineTo(9, 5.5); endShape.lineTo(0, 4.2); endShape.closePath();
  const endGeometry = new THREE.ExtrudeGeometry(endShape, { depth: 1.25, bevelEnabled: false });
  endGeometry.translate(0, 0, -0.625);
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const xTip = new THREE.Mesh(endGeometry, red);
      xTip.position.set(end * 47, 27.2, 18 + side * 47.5);
      xTip.rotation.y = end < 0 ? Math.PI : 0;
      const zTip = new THREE.Mesh(endGeometry, red);
      zTip.position.set(side * 41.5, 27.2, 18 + end * 53);
      zTip.rotation.y = -end * Math.PI / 2;
      group.add(xTip, zTip);
    }
  }
  const addTower = (x: number, z: number, corner: boolean) => {
    const radius = corner ? 4.7 : 3.25;
    const height = corner ? 33 : 25.5;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 0.15, height, 32), core);
    tower.name = corner ? "san-siro-corner-tower" : "san-siro-access-tower";
    tower.position.set(x, height / 2, z);
    const ramp = new THREE.Mesh(createSpiralRamp(radius, 24.5), concrete);
    ramp.position.set(x, 0, z);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.8, radius + 0.8, 0.35, 32), concrete);
    plinth.position.set(x, 0.18, z);
    group.add(tower, ramp, plinth);
    if (corner) {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.04, radius + 0.04, 8, 32), concrete);
      crown.position.set(x, 29, z);
      const opening = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.55, 32), dark);
      opening.rotation.x = -Math.PI / 2;
      opening.position.set(x, 33.015, z);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.1, 0.3, 6, 32), concrete);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(x, 33.15, z);
      group.add(crown, opening, rim);
      for (const sign of [-1, 1]) {
        block(red, x, 33.8, z + sign * 1.4, 5.5, 0.25, 0.2);
        block(dark, x + sign * 1.3, 33.6, z, 0.5, 0.8, 1.1);
      }
    }
  };
  for (const x of [-43, 43]) for (const z of [-31, 67]) addTower(x, z, true);
  for (const x of [-43, 43]) for (const z of [-8, 18, 44]) addTower(x, z, false);
  addTower(0, 69.5, false);
  return finish();
}
