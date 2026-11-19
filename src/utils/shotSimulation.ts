import * as THREE from "three";
import type { Difficulty, GKType } from "../store/gameStore";

export const SHOT_GRAVITY = 9.81;
export const GOAL = { z: -4.04, halfWidth: 3.66, height: 2.44, depth: 1.5 };

/** Shared by the aim indicator and the shot so both point at the same goal position. */
export function getAimTargetX(aim: number) {
  return -4.2 + THREE.MathUtils.clamp(aim, 0, 1) * 8.4;
}

/** Continuous timing error replaces preselected goal/post/miss outcomes. */
export function createShot(targetX: number, scale: number) {
  const error = THREE.MathUtils.clamp((scale - 1) / 2, 0, 1);
  const spread = 0.04 + error * error * 0.4;
  const mishit = THREE.MathUtils.clamp((scale - 1.3) / 1.7, 0, 1);
  const direction = Math.sign(targetX) || (Math.random() < 0.5 ? -1 : 1);
  // Mistimed edge shots drift outside the post rather than back toward the keeper.
  const x = targetX + (Math.random() + Math.random() - 1) * spread
    + direction * mishit * mishit * (1 + Math.random() * 4);
  const height = 0.55 + Math.pow(Math.abs(targetX) / 3.3, 1.3) * 1.15;
  const y = Math.max(0.18, height + Math.pow(error, 1.3) * 3.5 + (Math.random() * 2 - 1) * spread * 0.6);
  return { target: [x, y, GOAL.z] as [number, number, number], speed: 25 - error * 13 };
}

export function launchShot(velocity: THREE.Vector3, target: [number, number, number], speed: number) {
  const flightTime = (2 - GOAL.z) / speed;
  velocity.set(target[0] / flightTime,
    (target[1] - 0.15 + 0.5 * SHOT_GRAVITY * flightTime * flightTime) / flightTime,
    -speed);
}

/** Keepers read the shot imperfectly, commit once, then cannot chase a new target. */
export function chooseKeeperDive(targetX: number, difficulty: Difficulty, type: GKType, scale: number) {
  const readingError = difficulty === "easy" ? 2.2 : difficulty === "medium" ? 1.4 : 0.8;
  const readChance = difficulty === "easy" ? 0.4 : difficulty === "medium" ? 0.65 : 0.82;
  const error = THREE.MathUtils.clamp((scale - 1) / 2, 0, 1);
  // Clean strikes give less away; mistimed shots are easier for the keeper to read.
  const readsShot = Math.random() < readChance * (0.45 + error * 0.75);
  const guess = readsShot ? targetX : (Math.random() * 2 - 1) * 3.1;
  const reach = type === "bear" ? 2.1 : 2.8;
  return THREE.MathUtils.clamp(guess + (Math.random() * 2 - 1) * readingError, -reach, reach);
}

export function keeperReaction(difficulty: Difficulty, speedMultiplier: number) {
  return (difficulty === "easy" ? 0.16 : difficulty === "medium" ? 0.105 : 0.065) / Math.sqrt(speedMultiplier);
}

export function isInsideGoal(x: number, y: number, radius: number) {
  return Math.abs(x) + radius < GOAL.halfWidth && y + radius < GOAL.height && y - radius >= -0.001;
}

/** Constant-time collisions with the three closed net surfaces; the front stays open. */
export function constrainScoredBall(position: THREE.Vector3, velocity: THREE.Vector3, radius: number) {
  if (position.z > GOAL.z) return false;
  let touched = false;
  const side = GOAL.halfWidth - radius;
  if (Math.abs(position.x) > side) {
    position.x = Math.sign(position.x) * side;
    velocity.x = -Math.sign(position.x) * Math.abs(velocity.x) * 0.18;
    velocity.z *= 0.75;
    touched = true;
  }
  if (position.y > GOAL.height - radius) {
    position.y = GOAL.height - radius;
    velocity.y = -Math.abs(velocity.y) * 0.18;
    touched = true;
  }
  const back = GOAL.z - GOAL.depth + radius;
  if (position.z < back) {
    position.z = back;
    velocity.z = Math.abs(velocity.z) * 0.2;
    velocity.x *= 0.5;
    touched = true;
  }
  return touched;
}
