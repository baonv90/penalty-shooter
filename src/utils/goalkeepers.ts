import * as THREE from "three";
import { createFaceTexture } from "./textures";
import { createHumanoid } from "./models";
import type { GKType } from "../store/gameStore";

export interface GKData {
  group: THREE.Group;
  scale: number;
  speedMultiplier: number;
  diveHeight?: number;
  armL?: THREE.Object3D;
  armR?: THREE.Object3D;
  pose?: { head: THREE.Group; legL: THREE.Object3D; legR: THREE.Object3D };
  rig?: {
    head: THREE.Group;
    legL: THREE.Group;
    legR: THREE.Group;
    tail?: THREE.Group;
    idleSpeed: number;
  };
}

export function createGoalkeeper(type: GKType = "human"): GKData {
  return type === "human" ? createHumanGK() : createAnimalGK(type);
}

/** Shared rounded parts and shoulder/hip pivots keep both animal rigs consistent. */
function createAnimalGK(type: "bear" | "skunk"): GKData {
  const bear = type === "bear";
  const group = new THREE.Group();
  group.name = `${type}-keeper`;
  const fur = new THREE.MeshStandardMaterial({ color: bear ? 0x8b5536 : 0x28303f, roughness: 0.85 });
  const cream = new THREE.MeshStandardMaterial({ color: bear ? 0xf1cf99 : 0xf4f1e8, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151b25, roughness: 0.5 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xda8a91, roughness: 0.7 });
  const ball = new THREE.SphereGeometry(1, 16, 12);
  const ellipsoid = (parent: THREE.Object3D, material: THREE.Material,
    position: [number, number, number], scale: [number, number, number]) => {
    const mesh = new THREE.Mesh(ball, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const width = bear ? 0.46 : 0.25;
  const shoulderY = bear ? 1.03 : 0.85;
  ellipsoid(group, fur, [0, bear ? 0.83 : 0.65, 0], [width, bear ? 0.54 : 0.4, bear ? 0.3 : 0.22]);
  ellipsoid(group, cream, [0, bear ? 0.81 : 0.64, bear ? 0.25 : 0.18],
    [bear ? 0.29 : 0.14, bear ? 0.35 : 0.25, 0.07]);

  const head = new THREE.Group();
  head.name = "head-pivot";
  head.position.set(0, bear ? 1.43 : 1.12, 0.02);
  group.add(head);
  ellipsoid(head, fur, [0, 0.13, 0], [bear ? 0.33 : 0.25, bear ? 0.31 : 0.24, bear ? 0.28 : 0.22]);
  for (const side of [-1, 1]) {
    ellipsoid(head, fur, [side * (bear ? 0.25 : 0.19), bear ? 0.37 : 0.33, 0], [0.11, bear ? 0.12 : 0.15, 0.07]);
    ellipsoid(head, bear ? cream : pink, [side * (bear ? 0.25 : 0.19), bear ? 0.37 : 0.33, 0.055], [0.06, 0.075, 0.025]);
    ellipsoid(head, dark, [side * (bear ? 0.12 : 0.095), 0.19, bear ? 0.25 : 0.2], [0.038, 0.046, 0.025]);
    ellipsoid(head, cream, [side * (bear ? 0.12 : 0.095) - 0.01, 0.205, bear ? 0.273 : 0.223], [0.012, 0.015, 0.008]);
  }
  ellipsoid(head, cream, [0, 0.055, bear ? 0.25 : 0.2], [bear ? 0.17 : 0.13, 0.11, bear ? 0.13 : 0.12]);
  ellipsoid(head, bear ? dark : pink, [0, 0.095, bear ? 0.365 : 0.31], [0.065, 0.045, 0.035]);
  if (!bear) {
    ellipsoid(head, cream, [0, 0.29, 0.15], [0.065, 0.14, 0.08]);
    ellipsoid(group, cream, [0, 0.75, -0.19], [0.07, 0.3, 0.06]);
  }

  const limb = (name: string, x: number, y: number, arm: boolean) => {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(x, y, arm && bear ? 0.15 : 0);
    group.add(pivot);
    const length = arm ? (bear ? 0.48 : 0.3) : 0.28;
    const radius = bear ? (arm ? 0.15 : 0.115) : 0.075;
    ellipsoid(pivot, fur, [0, -length / 2, 0], [radius, length / 2 + radius * 0.5, radius]);
    const paw = ellipsoid(pivot, arm ? cream : dark,
      [0, -length, arm && bear ? 0.12 : 0.045],
      [radius * (arm && bear ? 1.5 : 1.18), radius * 0.95, radius * 1.3]);
    paw.name = arm ? "paw" : "foot";
    return pivot;
  };
  const armL = limb("left-shoulder", -width * 1.12, shoulderY, true);
  const armR = limb("right-shoulder", width * 1.12, shoulderY, true);
  const legL = limb("left-hip", -width * 0.53, 0.38, false);
  const legR = limb("right-hip", width * 0.53, 0.38, false);
  let tail: THREE.Group | undefined;
  if (!bear) {
    tail = new THREE.Group();
    tail.name = "tail-pivot";
    tail.position.set(0, 0.42, -0.16);
    group.add(tail);
    ellipsoid(tail, fur, [0, 0.32, -0.32], [0.23, 0.49, 0.2]).rotation.x = -0.55;
    ellipsoid(tail, cream, [0, 0.37, -0.48], [0.085, 0.44, 0.055]).rotation.x = -0.55;
  } else {
    ellipsoid(group, fur, [0, 0.48, -0.3], [0.12, 0.12, 0.12]);
  }
  return { group, armL, armR, scale: bear ? 1.45 : 0.95,
    speedMultiplier: bear ? 0.6 : 2.7,
    diveHeight: bear ? 0.55 : 0.95,
    rig: { head, legL, legR, tail, idleSpeed: bear ? 2.5 : 5 } };
}

/** Absolute idle poses and damped dive poses avoid drift and abrupt limb snaps. */
export function animateGoalkeeper(data: GKData, time: number, delta: number, diving: boolean, x: number,
  dive?: { elapsed: number; duration: number; targetY: number; targetX: number }) {
  if (dive) {
    const progress = THREE.MathUtils.clamp(dive.elapsed / Math.max(dive.duration, 0.65), 0, 1);
    const push = THREE.MathUtils.smoothstep(dive.elapsed / dive.duration / 0.7, 0, 1);
    const landing = THREE.MathUtils.smoothstep((progress - 0.72) / 0.28, 0, 1);
    const lateral = Math.min(Math.abs(dive.targetX) / 0.8, 1);
    const direction = dive.targetX >= 0 ? -1 : 1;
    const reach = THREE.MathUtils.clamp(dive.targetY / 2.44, 0, 1);
    data.group.rotation.z = direction * lateral * push * (1.15 + landing * 0.2);
    data.group.rotation.x = (1 - lateral) * push * 0.16;
    const lift = Math.sin(progress * Math.PI) * (data.diveHeight ?? 0.55) * (0.3 + reach * 0.7);
    data.group.position.y = lift + lateral * push * data.scale * 0.35;
    const armAngle = 0.7 + push * (1.25 + reach * 0.55) - landing * 0.15;
    if (data.armL) { data.armL.rotation.z = -armAngle; data.armL.rotation.x = -push * 0.25; }
    if (data.armR) { data.armR.rotation.z = armAngle; data.armR.rotation.x = -push * 0.25; }
    const pose = data.rig ?? data.pose;
    if (pose) {
      pose.head.rotation.z = -data.group.rotation.z * 0.2;
      pose.legL.rotation.x = -push * 0.45 + landing * 0.15;
      pose.legR.rotation.x = push * 0.3;
      pose.legL.rotation.z = -push * 0.2;
      pose.legR.rotation.z = push * 0.25;
    }
    if (data.rig?.tail) data.rig.tail.rotation.x = -push * 0.3;
    return;
  }
  data.group.rotation.x = 0;
  if (data.armL) data.armL.rotation.x = 0;
  if (data.armR) data.armR.rotation.x = 0;
  const idlePose = data.rig ?? data.pose;
  if (idlePose) {
    idlePose.legL.rotation.z = idlePose.legR.rotation.z = 0;
    idlePose.legL.rotation.x = idlePose.legR.rotation.x = 0;
    idlePose.head.rotation.z = 0;
  }
  const blend = 1 - Math.exp(-delta * 12 * Math.max(1, data.speedMultiplier));
  const amount = diving ? Math.min(Math.abs(x) / 1.8, 1) : 0;
  const idle = Math.sin(time * (data.rig?.idleSpeed ?? 3));
  const direction = x > 0 ? -1 : 1;
  data.group.rotation.z = THREE.MathUtils.lerp(data.group.rotation.z, direction * amount * 1.15, blend);
  data.group.position.y = THREE.MathUtils.lerp(data.group.position.y,
    diving ? Math.sin(amount * Math.PI * 0.7) * (data.diveHeight ?? 0.55) : (idle + 1) * 0.012, blend);
  const armAngle = (data.rig ? 0.7 : 0.5) + amount * 1.8 + (diving ? 0 : idle * 0.07);
  const armDirection = -1;
  if (data.armL) data.armL.rotation.z = THREE.MathUtils.lerp(data.armL.rotation.z, armDirection * armAngle, blend);
  if (data.armR) data.armR.rotation.z = THREE.MathUtils.lerp(data.armR.rotation.z, -armDirection * armAngle, blend);
  if (data.rig) {
    data.rig.head.rotation.z = -data.group.rotation.z * 0.18;
    data.rig.head.rotation.y = diving ? 0 : Math.sin(time * 0.8) * 0.09;
    data.rig.legL.rotation.x = diving ? -amount * 0.4 : idle * 0.04;
    data.rig.legR.rotation.x = diving ? amount * 0.3 : -idle * 0.04;
    if (data.rig.tail) {
      data.rig.tail.rotation.z = Math.sin(time * 4) * (diving ? 0.1 : 0.18);
      data.rig.tail.rotation.x = -amount * 0.3;
    }
  }
}

function createHumanGK(): GKData {
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffdbac,
    roughness: 0.6,
  });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

  // Gọi hàm tạo người hiện tại
  const human = createHumanoid(
    skinMat,
    shirtMat,
    shortsMat,
    0x000000,
    createFaceTexture(),
    false
  );

  human.headGroup.scale.setScalar(1.3);

  return {
    group: human.group,
    scale: 1,
    speedMultiplier: 1,
    armL: human.armL,
    armR: human.armR,
    pose: { head: human.headGroup, legL: human.legL, legR: human.legR },
  };
}
