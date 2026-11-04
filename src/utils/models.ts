import * as THREE from "three";
import { createJerseyNumberGeometry, jerseyNumberColor } from "./jersey";
import { createCrowdDetails } from "../components/stadium/createCrowdDetails";

export interface StadiumData {
  updateCrowd?: (time: number, celebrating: boolean) => void;
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

  // Six terraces share one draw call, leaving room for more audience detail.
  const terraces = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x334155 }), 6);
  const terraceTransform = new THREE.Object3D();
  for (let i = 0; i < 6; i++) {
    const stepY = i * 1.2;
    const stepZ = -i * 2.2;
    terraceTransform.position.set(0, stepY / 2, stepZ);
    terraceTransform.scale.set(55, stepY + 1.6, 2.2);
    terraceTransform.updateMatrix();
    terraces.setMatrixAt(i, terraceTransform.matrix);
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

  stadiumGroup.add(terraces);
  const totalFans = fanPositions.length;

  // 2. Supporter Bodies & Heads
  const bodyGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.7, 8);
  const bodyMat = new THREE.MeshStandardMaterial();
  const bodiesInstanced = new THREE.InstancedMesh(bodyGeo, bodyMat, totalFans);

  const headGeo = new THREE.SphereGeometry(0.18, 6, 4);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
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

  const accessoriesMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const raisedCount = Math.ceil(totalFans / 4);
  const relaxed = new THREE.InstancedMesh(createCrowdDetails(false), accessoriesMat, totalFans - raisedCount);
  const raised = new THREE.InstancedMesh(createCrowdDetails(true), accessoriesMat, raisedCount);
  const heights = new Float32Array(totalFans);
  const offsets = new Float32Array(totalFans);
  const skinColors = [0xffdbac, 0xd4a17a, 0x996b4f, 0xe8bd99];
  let relaxedIndex = 0;
  let raisedIndex = 0;
  let flagIndex = 0;
  fanPositions.forEach((pos, idx) => {
    const height = 0.9 + (idx % 7) * 0.025;
    heights[idx] = height;
    offsets[idx] = ((idx * 17 % 11) - 5) * 0.015;
    dummy.scale.set(1, height, 1);
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
    dummy.position.set(pos.x, pos.y + 0.55 * height, pos.z);
    dummy.updateMatrix();
    headsInstanced.setMatrixAt(idx, dummy.matrix);
    headsInstanced.setColorAt(idx, color.setHex(skinColors[idx % skinColors.length]));
    dummy.position.set(pos.x, pos.y, pos.z);
    dummy.rotation.y = offsets[idx];
    dummy.updateMatrix();
    if (idx % 4 === 0) raised.setMatrixAt(raisedIndex++, dummy.matrix);
    else relaxed.setMatrixAt(relaxedIndex++, dummy.matrix);
    dummy.rotation.y = 0;
  });

  // Tiny per-instance phase attributes let the GPU animate bodies and accessories together.
  const uniforms = { crowdTime: { value: 0 }, crowdCelebration: { value: 0 } };
  const animateMaterial = (material: THREE.MeshStandardMaterial) => {
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = "attribute float crowdPhase; uniform float crowdTime; uniform float crowdCelebration;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>",
        "#include <begin_vertex>\n transformed.y += max(0.0, sin(crowdTime * mix(3.0, 10.0, crowdCelebration) + crowdPhase)) * mix(0.035, 0.22, crowdCelebration);");
    };
    material.customProgramCacheKey = () => "stadium-crowd-v1";
  };
  animateMaterial(bodyMat);
  animateMaterial(headMat);
  animateMaterial(accessoriesMat);
  const phases = fanPositions.map(pos => pos.phase);
  bodyGeo.setAttribute("crowdPhase", new THREE.InstancedBufferAttribute(new Float32Array(phases), 1));
  headGeo.setAttribute("crowdPhase", new THREE.InstancedBufferAttribute(new Float32Array(phases), 1));
  relaxed.geometry.setAttribute("crowdPhase", new THREE.InstancedBufferAttribute(new Float32Array(phases.filter((_, i) => i % 4 !== 0)), 1));
  raised.geometry.setAttribute("crowdPhase", new THREE.InstancedBufferAttribute(new Float32Array(phases.filter((_, i) => i % 4 === 0)), 1));
  flagsInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  stadiumGroup.add(bodiesInstanced, headsInstanced, flagsInstanced, relaxed, raised);
  // Only flags need matrix uploads; all other crowd movement uses two shared uniforms.
  const updateCrowd = (time: number, celebrating: boolean) => {
    uniforms.crowdTime.value = time;
    uniforms.crowdCelebration.value = celebrating ? 1 : 0;
    let flag = 0;
    for (let i = 0; i < totalFans && flag < flagCount; i += 10) {
      const pos = fanPositions[i];
      const jump = Math.max(0, Math.sin(time * (celebrating ? 10 : 3) + pos.phase)) * (celebrating ? 0.22 : 0.035) * heights[i];
      const wave = Math.sin(time * 6 + pos.phase) * 0.35;
      dummy.position.set(pos.x + 0.4, pos.y + jump + 0.8, pos.z + 0.2);
      dummy.scale.setScalar(1);
      dummy.rotation.set(0, wave, wave * 0.5);
      dummy.updateMatrix();
      flagsInstanced.setMatrixAt(flag++, dummy.matrix);
    }
    flagsInstanced.instanceMatrix.needsUpdate = true;
  };

  return {
    stadiumGroup,
    updateCrowd,
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
  ctx.font = "900 168px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(numberStr, 128, 136, 220);

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

  const skinDetail = new THREE.MeshStandardMaterial({ color: 0x6a4032, roughness: 0.8 });
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xf5eee5, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x202a38, roughness: 0.7 });
  const sphere = new THREE.SphereGeometry(1, 10, 8);
  const rounded = (parent: THREE.Object3D, material: THREE.Material,
    x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  };
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.55, 0);
  headGroup.scale.setScalar(0.82);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12),
    new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.75 }));
  head.scale.set(0.91, 1.1, 0.95);
  headGroup.add(head);
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.173, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.47), hairMat);
  hair.scale.set(0.94, 1.1, 0.95);
  hair.position.y = 0.035;
  headGroup.add(hair);
  const face = new THREE.Group();
  face.rotation.y = isKicker ? Math.PI : 0;
  headGroup.add(face);
  for (const side of [-1, 1]) {
    rounded(face, skinMat, side * 0.155, -0.005, 0, 0.025, 0.045, 0.025);
    rounded(face, eyeWhite, side * 0.055, 0.025, 0.145, 0.026, 0.014, 0.015);
    rounded(face, dark, side * 0.055, 0.025, 0.159, 0.01, 0.011, 0.006);
    rounded(face, hairMat, side * 0.055, 0.057, 0.145, 0.029, 0.007, 0.008);
  }
  rounded(face, skinMat, 0, -0.015, 0.158, 0.024, 0.037, 0.034);
  rounded(face, skinDetail, 0, -0.07, 0.143, 0.034, 0.006, 0.009);
  rounded(group, skinMat, 0, 1.37, 0, 0.065, 0.085, 0.065);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.65, 12), shirtMat);
  body.position.set(0, 0.99, 0);
  // Flatten geometry itself so child jersey numbers retain their own proportions.
  body.geometry.scale(1, 1, 0.7);
  const hips = new THREE.Group();
  hips.position.y = 0.65;
  const waistband = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.14, 12), shortsMat);
  waistband.geometry.scale(1, 1, 0.72);
  waistband.position.y = 0.025;
  hips.add(waistband);
  group.add(hips);
  const numberMaterial = new THREE.MeshBasicMaterial({
    map: createNumberTexture(shirtNumber),
    color: jerseyNumberColor(shirtMat instanceof THREE.MeshStandardMaterial ? shirtMat.color.getHex() : 0),
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  });
  const jerseyNumber = new THREE.Mesh(createJerseyNumberGeometry(isKicker ? 1 : -1), numberMaterial);
  jerseyNumber.name = "jersey-number";
  body.add(jerseyNumber);
  const sockMat = new THREE.MeshStandardMaterial({ color: isKicker ? 0xf1f5f9 : 0x263744, roughness: 0.8 });
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0xe6e9da, roughness: 0.8 });
  const createArm = (x: number, y: number, radius: number, length: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    group.add(pivot);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.88, length / 2, 10), skinMat);
    upper.position.y = -length / 4;
    pivot.add(upper);
    // Shoulder caps overlap the torso and remain fixed at each rotation pivot.
    rounded(pivot, shirtMat, 0, 0, 0, radius * 1.3, radius * 1.3, radius * 1.3);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.25, radius * 1.15, 0.14, 10), shirtMat);
    sleeve.position.y = -0.055;
    pivot.add(sleeve);
    const joint = new THREE.Group();
    joint.position.y = -length / 2;
    pivot.add(joint);
    rounded(joint, skinMat, 0, 0, 0, radius * 0.9, radius * 0.9, radius * 0.9);
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.86, radius * 0.65, length / 2, 10), skinMat);
    lower.position.y = -length / 4;
    joint.add(lower);
    const extremity = rounded(joint, isKicker ? skinMat : gloveMat,
      0, -length / 2 + 0.065, 0,
      isKicker ? 0.045 : 0.065,
      0.075, 0.03);
    return { pivot, joint, extremity };
  };
  const leftArm = createArm(-0.225, 1.235, 0.065, 0.58);
  const rightArm = createArm(0.225, 1.235, 0.065, 0.58);
  const createLeg = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.105, 0.65, 0);
    group.add(pivot);
    // Each short leg overlaps the compact pelvis, leaving a natural crotch gap below it.
    rounded(pivot, shortsMat, 0, -0.025, 0, 0.105, 0.105, 0.11);
    const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.095, 0.19, 10), shortsMat);
    shorts.geometry.scale(1, 1, 1.05);
    shorts.position.y = -0.09;
    pivot.add(shorts);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.065, 0.325, 10), skinMat);
    thigh.position.y = -0.1625;
    pivot.add(thigh);
    const joint = new THREE.Group();
    joint.position.y = -0.325;
    pivot.add(joint);
    rounded(joint, skinMat, 0, 0, 0.005, 0.066, 0.065, 0.068);
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.043, 0.325, 10), skinMat);
    calf.position.y = -0.1625;
    joint.add(calf);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.067, 0.047, 0.2, 10), sockMat);
    sock.position.y = -0.17;
    joint.add(sock);
    rounded(joint, sockMat, 0, -0.07, 0, 0.068, 0.025, 0.068);
    const forward = isKicker ? -1 : 1;
    const extremity = rounded(joint, dark, 0, -0.26, forward * 0.08, 0.083, 0.06, 0.165);
    rounded(joint, dark, 0, -0.305, forward * 0.08, 0.085, 0.017, 0.16);
    rounded(joint, sockMat, 0, -0.207, forward * 0.095, 0.055, 0.009, 0.075);
    return { pivot, joint, extremity };
  };
  const leftLeg = createLeg(-1);
  const rightLeg = createLeg(1);
  group.add(headGroup, body);
  group.traverse(object => { if (object instanceof THREE.Mesh) object.castShadow = true; });
  return { group, body, headGroup, hips, numberMaterial, shirtNumber,
    armL: leftArm.pivot, armR: rightArm.pivot,
    elbowL: leftArm.joint, elbowR: rightArm.joint,
    legL: leftLeg.pivot, legR: rightLeg.pivot,
    kneeL: leftLeg.joint, kneeR: rightLeg.joint,
    footL: leftLeg.extremity, footR: rightLeg.extremity };

}

// Keep the existing scene API; the full-field layout lives in one module.
export { createFieldGrass as createOptimizedPitch, createFieldMarkings as createPitchLines } from "./pitch";
