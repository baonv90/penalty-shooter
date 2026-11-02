import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as THREE from 'three';

const source = readFileSync(new URL('../src/utils/penaltyPhysics.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  .replace('"three"', JSON.stringify(import.meta.resolve('three')));
const { createKeeperCollision, disposeScene } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const sphere = (x, radius = 0.2) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16));
  mesh.position.x = x;
  return mesh;
};

test('empty space between separate body parts does not save a shot', () => {
  const keeper = new THREE.Group();
  keeper.add(sphere(-0.6), sphere(0.6));
  const collide = createKeeperCollision(keeper);
  assert.equal(collide(v(0, 0, 2), v(0, 0, -2)), false);
  assert.equal(collide(v(0.6, 0, 2), v(0.6, 0, -2)), true);
});

test('fast sweeps hit thin limbs, including the ball radius', () => {
  const keeper = new THREE.Group();
  keeper.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1)));
  const collide = createKeeperCollision(keeper);
  assert.equal(collide(v(0.18, 0, 10), v(0.18, 0, -10)), true);
  assert.equal(collide(v(0.21, 0, 10), v(0.21, 0, -10)), false);
  assert.equal(collide(v(0, 0, 10), v(0, 0, 1)), false);
});

test('collision follows parent scale and updated limb rotation', () => {
  const keeper = new THREE.Group();
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1));
  keeper.add(arm);
  keeper.scale.setScalar(2);
  const collide = createKeeperCollision(keeper);
  assert.equal(collide(v(0.7, 0, 2), v(0.7, 0, -2)), false);
  arm.rotation.z = Math.PI / 2;
  assert.equal(collide(v(0.7, 0, 2), v(0.7, 0, -2)), true);
});

test('stationary sphere contact works', () => {
  const keeper = new THREE.Group();
  keeper.add(sphere(0));
  const collide = createKeeperCollision(keeper);
  assert.equal(collide(v(0, 0, 0.3), v(0, 0, 0.3)), true);
  assert.equal(collide(v(0, 0, 0.4), v(0, 0, 0.4)), false);
});

test('shared geometry, materials, and textures are disposed once', () => {
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry();
  const texture = new THREE.Texture();
  const material = new THREE.MeshBasicMaterial({ map: texture });
  scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  const counts = [0, 0, 0];
  [geometry, material, texture].forEach((resource, i) => resource.addEventListener('dispose', () => counts[i]++));
  disposeScene(scene);
  assert.deepEqual(counts, [1, 1, 1]);
});
