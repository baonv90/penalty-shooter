import * as THREE from "three";

export interface StadiumData {
  stadiumGroup: THREE.Group;
  bodiesInstanced: THREE.InstancedMesh;
  headsInstanced: THREE.InstancedMesh;
  flagsInstanced: THREE.InstancedMesh;
  fanPositions: Array<{
    x: number;
    y: number;
    z: number;
    isHome: boolean;
    phase: number;
  }>;
  flagCount: number;
}

export function createOptimizedStadium(
  homeColor: number,
  awayColor: number
): StadiumData {
  const stadiumGroup = new THREE.Group();
  stadiumGroup.position.set(0, 0, -10);

  const fanPositions: Array<{
    x: number;
    y: number;
    z: number;
    isHome: boolean;
    phase: number;
  }> = [];

  // 1. Calculate Bleachers & Fan Positions
  for (let i = 0; i < 6; i++) {
    const stepY = i * 1.2;
    const stepZ = -i * 2.2;

    const row = new THREE.Mesh(
      new THREE.BoxGeometry(55, stepY + 1.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    row.position.set(0, stepY / 2, stepZ);
    stadiumGroup.add(row);

    for (let j = -25; j <= 25; j += 1.1) {
      fanPositions.push({
        x: j,
        y: stepY + 0.9,
        z: stepZ,
        isHome: Math.random() > 0.3,
        phase: Math.random() * Math.PI * 2, // Random offset so fans don't jump in sync
      });
    }
  }

  const totalFans = fanPositions.length;

  // 2. Supporter Bodies & Heads
  const bodyGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.7, 8);
  const bodyMat = new THREE.MeshStandardMaterial();
  const bodiesInstanced = new THREE.InstancedMesh(bodyGeo, bodyMat, totalFans);

  const headGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
  const headsInstanced = new THREE.InstancedMesh(headGeo, headMat, totalFans);

  // 3. Flags Geometry & Material (Every ~15th supporter holds a flag)
  const flagCount = Math.floor(totalFans / 10);
  const flagGeo = new THREE.PlaneGeometry(1, 0.7);
  const flagMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 0.6,
  });
  const flagsInstanced = new THREE.InstancedMesh(flagGeo, flagMat, flagCount);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  let flagIndex = 0;
  fanPositions.forEach((pos, idx) => {
    // Set initial Body transform
    dummy.position.set(pos.x, pos.y + 0.05, pos.z);
    dummy.updateMatrix();
    bodiesInstanced.setMatrixAt(idx, dummy.matrix);
    color.setHex(pos.isHome ? homeColor : awayColor);
    bodiesInstanced.setColorAt(idx, color);
    if (idx % 10 === 0 && flagIndex < flagCount) {
      flagsInstanced.setColorAt(flagIndex++, color);
    }

    // Set initial Head transform
    dummy.position.set(pos.x, pos.y + 0.55, pos.z);
    dummy.updateMatrix();
    headsInstanced.setMatrixAt(idx, dummy.matrix);
  });

  bodiesInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  headsInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flagsInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  stadiumGroup.add(bodiesInstanced, headsInstanced, flagsInstanced);

  return {
    stadiumGroup,
    bodiesInstanced,
    headsInstanced,
    flagsInstanced,
    fanPositions,
    flagCount,
  };
}

// Generates a 2D Canvas texture with the player number
export function createNumberTexture(
  numberStr: string,
  textColor = "#ffffff"
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Transparent background so only the number renders
  ctx.clearRect(0, 0, 256, 256);

  // Draw Number
  ctx.fillStyle = textColor;
  ctx.font = "bold 180px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(numberStr, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createHumanoid(
  skinMat: THREE.Material,
  shirtMat: THREE.Material,
  shortsMat: THREE.Material,
  hairColor: number,
  faceTex: THREE.Texture,
  isKicker: boolean,
  shirtNumber: string = "10"
) {
  const group = new THREE.Group();

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.25, 0);
  const headMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.5,
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), headMat);
  head.castShadow = true;
  head.rotation.y = isKicker ? Math.PI : 0;
  headGroup.add(head);

  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.9,
  });
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2),
    hairMat
  );
  hair.position.y = 0.02;
  hair.castShadow = true;
  headGroup.add(hair);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.2, 0.6, 16),
    shirtMat
  );
  body.position.set(0, 0.75, 0);
  body.castShadow = true;
  body.receiveShadow = true;

  // --- ADD SHIRT NUMBER TO THE BACK ---
  const numTex = createNumberTexture(shirtNumber, "#ffffff");
  const numMat = new THREE.MeshBasicMaterial({
    map: numTex,
    transparent: true,
    side: THREE.DoubleSide, // 1. Render both sides so rotation/orientation won't hide it
    polygonOffset: true, // 2. Prevent Z-fighting with the shirt surface
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const numberMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.32),
    numMat
  );

  // 3. Pushed slightly further out on the Z-axis (Z = 0.23) so it sits outside the cylinder
  numberMesh.position.set(0.045, 0.05, 0.23);
  numberMesh.rotation.y = 0.25;

  body.add(numberMesh);

  const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.5, 16);
  const armL = new THREE.Mesh(armGeo, skinMat);
  armL.position.set(-0.3, 0.7, 0);
  armL.castShadow = true;
  const armR = new THREE.Mesh(armGeo, skinMat);
  armR.position.set(0.3, 0.7, 0);
  armR.castShadow = true;

  const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.45, 16);
  const legL = new THREE.Mesh(legGeo, shortsMat);
  legL.position.set(-0.12, 0.25, 0);
  legL.castShadow = true;
  const legR = new THREE.Mesh(legGeo, shortsMat);
  legR.position.set(0.12, 0.25, 0);
  legR.castShadow = true;

  group.add(headGroup, body, armL, armR, legL, legR);
  return { group, armL, armR, legL, legR, body };
}

// Keep the existing scene API; the full-field layout lives in one module.
export { createFieldGrass as createOptimizedPitch, createFieldMarkings as createPitchLines } from "./pitch";
