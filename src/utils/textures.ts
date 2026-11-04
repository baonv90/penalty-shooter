import * as THREE from "three";

export function getHexColor(tailwindClass?: string): number {
  switch (tailwindClass) {
    case "bg-red-600":
      return 0xdc2626;
    case "bg-blue-600":
      return 0x2563eb;
    case "bg-yellow-400":
      return 0xfacc15;
    case "bg-white":
      return 0xffffff;
    case "bg-green-500":
      return 0x22c55e;
    default:
      return 0xdc2626;
  }
}

export function createJerseyTexture(hexColor: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const colorStr = "#" + hexColor.toString(16).padStart(6, "0");
  ctx.fillStyle = colorStr;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = hexColor === 0xffffff ? "#000000" : "#ffffff";
  ctx.font = "bold 140px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("10", 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export function createFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffdbac";
  ctx.fillRect(0, 0, 128, 128);
  // Facial features are modeled in 3D; this texture supplies an even skin base.
  return new THREE.CanvasTexture(canvas);
}

export function createNetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  // Clear canvas (transparent background)
  ctx.clearRect(0, 0, 128, 128);

  // Thicker stroke for high visibility/contrast
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 12;
  ctx.strokeRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 12); // Crisp diamond/grid density
  return tex;
}

export function createSideNetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 128);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 32;
  ctx.strokeRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 12); // Reduced horizontal repeat to fit depth (1.5m)
  return tex;
}
