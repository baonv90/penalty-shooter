import * as THREE from "three";
import type { Difficulty, GKType } from "../store/gameStore";

export const SHOT_GRAVITY = 9.81;
export const GOAL = { z: -4.04, halfWidth: 3.66, height: 2.44 };

// Small forgiveness adjustments; 1 restores the original tuning.
const HORIZONTAL_AIM_VARIATION = 0.9;
const KEEPER_READ_CHANCE_MULTIPLIER = 0.9;

/** Continuous timing error replaces preselected goal/post/miss outcomes. */
export function createShot(targetX: number, scale: number) {
  const error = THREE.MathUtils.clamp((scale - 1) / 2, 0, 1);
  const spread = 0.06 + error * error * 1.9;
  const x = targetX + (Math.random() + Math.random() - 1) * spread * HORIZONTAL_AIM_VARIATION;
  const height = 0.55 + Math.pow(Math.abs(targetX) / 3.3, 1.3) * 1.15;
  const y = Math.max(0.18, height + error * error * 1.8 + (Math.random() * 2 - 1) * spread * 0.6);
  return { target: [x, y, GOAL.z] as [number, number, number], speed: 15 + (1 - error) * 4 };
}

export function launchShot(velocity: THREE.Vector3, target: [number, number, number], speed: number) {
  const flightTime = (2 - GOAL.z) / speed;
  velocity.set(target[0] / flightTime,
    (target[1] - 0.15 + 0.5 * SHOT_GRAVITY * flightTime * flightTime) / flightTime,
    -speed);
}

/** Keepers read the shot imperfectly, commit once, then cannot chase a new target. */
export function chooseKeeperDive(targetX: number, difficulty: Difficulty, type: GKType) {
  const readingError = difficulty === "easy" ? 2.2 : difficulty === "medium" ? 1.4 : 0.8;
  const readChance = difficulty === "easy" ? 0.4 : difficulty === "medium" ? 0.65 : 0.82;
  const readsShot = Math.random() < readChance * KEEPER_READ_CHANCE_MULTIPLIER;
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
