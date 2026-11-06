import * as THREE from "three";

/** Fine blades, uneven growth and occasional dry grass on a single seamless surface. */
export function createGardenGrassMaterial(width: number, depth: number) {
  const size = 256;
  const colors = new Uint8Array(size * size * 4), heights = new Uint8Array(size * size * 4);
  let seed = 19483;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const pixel = (x: number, y: number) => (((y + size) % size) * size + (x + size) % size) * 4;
  const heightAt = (offset: number, height: number) => {
    heights[offset] = heights[offset + 1] = heights[offset + 2] = height; heights[offset + 3] = 255;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    const growth = Math.sin(u * 3 + Math.cos(v * 2)) * 4 + Math.cos(v * 4 + Math.sin(u)) * 3;
    const grain = (random() - 0.5) * 25;
    const offset = pixel(x, y);
    colors[offset] = 103 + growth + grain;
    colors[offset + 1] = 148 + growth + grain;
    colors[offset + 2] = 90 + growth + grain * 0.7;
    colors[offset + 3] = 255;
    heightAt(offset, 85 + random() * 60);
  }
  const blades = [[93, 136, 74], [119, 155, 88], [111, 146, 77], [156, 152, 94]];
  for (let blade = 0; blade < 2100; blade++) {
    const x = Math.floor(random() * size), y = Math.floor(random() * size);
    const length = 3 + Math.floor(random() * 7), lean = (random() - 0.5) * 5;
    const color = blades[random() < 0.09 ? 3 : Math.floor(random() * 3)];
    for (let step = 0; step < length; step++) {
      const offset = pixel(Math.round(x + lean * step / length), y + step);
      const mix = 0.45 + Math.sin(step / length * Math.PI) * 0.25;
      for (let channel = 0; channel < 3; channel++) colors[offset + channel] = colors[offset + channel] * (1 - mix) + color[channel] * mix;
      heightAt(offset, 135 + Math.sin(step / length * Math.PI) * 65);
    }
  }
  const texture = (data: Uint8Array, color = false) => {
    const result = new THREE.DataTexture(data, size, size);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(width / 5, depth / 5);
    result.generateMipmaps = true;
    result.minFilter = THREE.LinearMipmapLinearFilter; result.magFilter = THREE.LinearFilter;
    result.anisotropy = 4;
    if (color) result.colorSpace = THREE.SRGBColorSpace;
    result.needsUpdate = true;
    return result;
  };
  const material = new THREE.MeshStandardMaterial({
    map: texture(colors, true), bumpMap: texture(heights), bumpScale: 0.035, roughness: 1,
  });
  material.name = "textured-garden-grass";
  return material;
}
