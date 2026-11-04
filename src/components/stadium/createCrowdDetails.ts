import * as THREE from "three";

/** One merged accessory mesh per pose: hair, faces, arms, trousers and shoes. */
export function createCrowdDetails(cheering: boolean) {
  const parts: THREE.BufferGeometry[] = [];
  const add = (geometry: THREE.BufferGeometry, colorHex: number, x: number, y: number, z: number, angle = 0) => {
    const part = geometry.index ? geometry.toNonIndexed() : geometry;
    if (part !== geometry) geometry.dispose();
    part.rotateZ(angle);
    part.translate(x, y, z);
    const color = new THREE.Color(colorHex);
    const colors = new Float32Array(part.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b; }
    part.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    parts.push(part);
  };
  for (const side of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.055, 0.045, 0.44, 5), 0xd6ae8c,
      side * (cheering ? 0.32 : 0.25), cheering ? 0.43 : 0.02, 0, side * (cheering ? 0.75 : 0.12));
    add(new THREE.CylinderGeometry(0.075, 0.065, 0.32, 5), 0x273447, side * 0.1, -0.39, 0);
    add(new THREE.BoxGeometry(0.13, 0.08, 0.21), 0x151e29, side * 0.1, -0.56, 0.035);
    add(new THREE.BoxGeometry(0.025, 0.025, 0.018), 0x202631, side * 0.06, 0.57, 0.19);
  }
  add(new THREE.SphereGeometry(0.18, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2),
    cheering ? 0x664631 : 0x2f2a29, 0, 0.59, -0.02);
  add(new THREE.BoxGeometry(0.045, 0.014, 0.015), 0x775044, 0, 0.49, 0.17);
  add(new THREE.BoxGeometry(0.35, 0.07, 0.06), 0xe5e7eb, 0, 0.32, 0.18);
  // All pieces are non-indexed and share this small fixed attribute layout.
  const result = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv", "color"]) {
    const itemSize = parts[0].getAttribute(name).itemSize;
    const length = parts.reduce((sum, part) => sum + part.getAttribute(name).array.length, 0);
    const merged = new Float32Array(length);
    let offset = 0;
    for (const part of parts) {
      const values = part.getAttribute(name).array;
      merged.set(values, offset);
      offset += values.length;
    }
    result.setAttribute(name, new THREE.BufferAttribute(merged, itemSize));
  }
  parts.forEach(part => part.dispose());
  return result;
}
