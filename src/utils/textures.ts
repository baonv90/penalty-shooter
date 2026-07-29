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
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(40, 50, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(88, 50, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(64, 75, 15, 0.2 * Math.PI, 0.8 * Math.PI, false);
  ctx.stroke();
  return new THREE.CanvasTexture(canvas);
}

export function createNetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(255,255,255,0)";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 14;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(512, 512);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 8);
  return tex;
}
