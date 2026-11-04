import * as THREE from "three";

export function jerseyNumberColor(jerseyHex: number) {
  const color = new THREE.Color(jerseyHex);
  return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722 > 0.5 ? 0x172235 : 0xffffff;
}

/** Match the tapered shirt surface, so numbers do not float or intersect the back. */
export function createJerseyNumberGeometry(backDirection: 1 | -1) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const columns = 12, rows = 4;
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    const y = 0.07 + (v - 0.5) * 0.29;
    const radius = THREE.MathUtils.lerp(0.17, 0.24, y / 0.65 + 0.5) + 0.003;
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const angle = (u - 0.5) * 1.35;
      positions.push(Math.sin(angle) * radius * backDirection, y, Math.cos(angle) * radius * 0.7 * backDirection);
      uvs.push(u, v);
      if (column < columns && row < rows) {
        const a = row * (columns + 1) + column;
        indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
