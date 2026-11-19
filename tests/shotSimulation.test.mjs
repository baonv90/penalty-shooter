import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as THREE from 'three';

const source = readFileSync(new URL('../src/utils/shotSimulation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  .replace('"three"', JSON.stringify(import.meta.resolve('three')));
const { createShot, chooseKeeperDive, getAimTargetX, launchShot, isInsideGoal, GOAL, SHOT_GRAVITY } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('green timing stays accurate across the aiming range; red timing loses accuracy and speed', t => {
  const originalRandom = Math.random;
  let seed = 12345;
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  try {
    const rates = [];
    for (const [minScale, maxScale] of [[1, 1.3], [1.3, 1.8], [1.8, 3]]) {
      let onTarget = 0;
      for (let i = 0; i < 10000; i++) {
        const aim = -3.4 + Math.random() * 6.8;
        const scale = minScale + Math.random() * (maxScale - minScale);
        const shot = createShot(aim, scale);
        const velocity = new THREE.Vector3();
        launchShot(velocity, shot.target, shot.speed);
        // Check the whole ball crossing the line, as the physics loop does.
        const time = (2 - GOAL.z + 0.15) / shot.speed;
        if (isInsideGoal(velocity.x * time, 0.15 + velocity.y * time - 0.5 * SHOT_GRAVITY * time ** 2, 0.15)) onTarget++;
      }
      rates.push(onTarget / 10000);
    }
    assert.ok(rates[0] > 0.98, `green on-target rate: ${rates[0]}`);
    assert.ok(rates[0] > rates[1] && rates[1] > rates[2], `green/yellow/red: ${rates}`);
    assert.ok(rates[2] < 0.25, `red on-target rate: ${rates[2]}`);
    t.diagnostic(`On-target rates before keeper/frame contact: green ${rates[0]}, yellow ${rates[1]}, red ${rates[2]}`);
    assert.ok(createShot(0, 1.3).speed > 23);
    assert.ok(createShot(0, 1.8).speed < 20);
    assert.ok(createShot(0, 3).speed < createShot(0, 1.8).speed);
  } finally {
    Math.random = originalRandom;
  }
});

test('green shots reach the selected edge while red edge shots drift outward', () => {
  const originalRandom = Math.random;
  try {
    for (const aim of [0, 0.25, 0.5, 0.75, 1]) {
      const targetX = getAimTargetX(aim);
      const angle = Math.atan2(-targetX, 2 - GOAL.z);
      assert.ok(Math.abs(-Math.tan(angle) * (2 - GOAL.z) - targetX) < 1e-10);
      for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
        Math.random = () => roll;
        for (const scale of [1, 1.15, 1.3]) {
          const shot = createShot(targetX, scale);
          const velocity = new THREE.Vector3();
          launchShot(velocity, shot.target, shot.speed);
          assert.ok(Math.abs(velocity.x * (2 - GOAL.z) / shot.speed - targetX) < 0.05);
        }
        if (aim === 0 || aim === 1) {
          const shot = createShot(targetX, 2.2);
          assert.ok(Math.abs(shot.target[0]) > Math.abs(targetX), 'poor edge shots drift outward');
          assert.equal(Math.sign(shot.target[0]), Math.sign(targetX));
          assert.ok(Math.abs(createShot(targetX, 3).target[0]) > GOAL.halfWidth + 0.15, 'worst timing misses outside the post');
        }
      }
    }
  } finally {
    Math.random = originalRandom;
  }
});

test('the wider aiming sweep passes both posts and still allows precise corner shots', () => {
  assert.equal(getAimTargetX(0), -4.2);
  assert.equal(getAimTargetX(1), 4.2);
  assert.equal(getAimTargetX(0.5), 0);
  assert.equal(getAimTargetX(-1), getAimTargetX(0));
  assert.equal(getAimTargetX(2), getAimTargetX(1));
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    for (const corner of [-3.3, 3.3]) {
      const aim = (corner + 4.2) / 8.4;
      assert.ok(aim > 0.1 && aim < 0.9, 'corners can be selected before the sweep turns');
      const shot = createShot(getAimTargetX(aim), 1);
      const velocity = new THREE.Vector3();
      launchShot(velocity, shot.target, shot.speed);
      const time = (2 - GOAL.z + 0.15) / shot.speed;
      assert.ok(isInsideGoal(velocity.x * time, 0.15 + velocity.y * time - 0.5 * SHOT_GRAVITY * time ** 2, 0.15));
    }
  } finally {
    Math.random = originalRandom;
  }
});

test('keepers can read a red shot when the same roll fails to read a green shot', () => {
  const originalRandom = Math.random;
  try {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      for (const type of ['human', 'bear', 'skunk']) {
        const roll = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.45 : 0.55;
        const dive = scale => {
          let first = true;
          Math.random = () => {
            if (!first) return 0.5;
            first = false;
            return roll;
          };
          return chooseKeeperDive(2, difficulty, type, scale);
        };
        assert.equal(dive(1.3), 0, `${difficulty}/${type} guesses on green`);
        assert.equal(dive(3), 2, `${difficulty}/${type} reads red`);
      }
    }
  } finally {
    Math.random = originalRandom;
  }
});
