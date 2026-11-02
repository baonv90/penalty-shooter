import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';

const bundle = await build({
  entryPoints: [new URL('../src/utils/goalkeepers.ts', import.meta.url).pathname],
  bundle: true, write: false, format: 'esm', platform: 'node', external: ['three'],
});
const source = bundle.outputFiles[0].text.replaceAll('"three"', JSON.stringify(import.meta.resolve('three')));
const { createGoalkeeper, animateGoalkeeper } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

for (const type of ['bear', 'skunk']) {
  test(`${type} has grounded proportions and shoulder pivots`, () => {
    const keeper = createGoalkeeper(type);
    keeper.group.scale.setScalar(keeper.scale);
    const bounds = new THREE.Box3().setFromObject(keeper.group);
    assert.ok(bounds.min.y >= -0.02);
    assert.ok(bounds.max.y < (type === 'bear' ? 3 : 2.44), 'height stays within the intended character proportions');
    assert.equal(keeper.armL.name, 'left-shoulder');
    assert.ok(keeper.armL.children.length > 0);
    assert.ok(keeper.armL.children[0].position.y < 0);
  });

  test(`${type} smoothly dives and returns to idle without scale drift`, () => {
    const keeper = createGoalkeeper(type);
    keeper.group.scale.setScalar(keeper.scale);
    animateGoalkeeper(keeper, 1, 1 / 60, true, 2);
    assert.ok(Math.abs(keeper.group.rotation.z) > 0);
    assert.ok(Math.abs(keeper.group.rotation.z) < 1.15);
    for (let i = 0; i < 300; i++) animateGoalkeeper(keeper, i / 60, 1 / 60, false, 0);
    assert.ok(Math.abs(keeper.group.rotation.z) < 0.001);
    assert.equal(keeper.group.scale.x, keeper.scale);
    assert.ok(Number.isFinite(keeper.rig.head.rotation.z));
    if (type === 'skunk') assert.ok(keeper.rig.tail);
  });
}

 test('bear paws extend outside its body in the ready pose', () => {
  const keeper = createGoalkeeper('bear');
  for (let i = 0; i < 60; i++) animateGoalkeeper(keeper, 0, 1 / 60, false, 0);
  keeper.group.updateMatrixWorld(true);
  const left = keeper.armL.getObjectByName('paw').getWorldPosition(new THREE.Vector3());
  const right = keeper.armR.getObjectByName('paw').getWorldPosition(new THREE.Vector3());
  assert.ok(left.x < -0.7);
  assert.ok(right.x > 0.7);
  assert.ok(keeper.scale > 1.25);
});

test('skunk reaches its dive pose faster and jumps higher', () => {
  const skunk = createGoalkeeper('skunk');
  const bear = createGoalkeeper('bear');
  assert.ok(skunk.speedMultiplier > 1.8);
  animateGoalkeeper(skunk, 1, 1 / 60, true, 2);
  animateGoalkeeper(bear, 1, 1 / 60, true, 2);
  assert.ok(Math.abs(skunk.group.rotation.z) > Math.abs(bear.group.rotation.z));
  assert.ok(skunk.group.position.y > bear.group.position.y);
});
