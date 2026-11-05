import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';

const bundle = await build({
  stdin: {
    contents: `
      export { createStadiumSurroundings } from './src/components/stadium/createStadiumSurroundings';
      export { createStadiumActivity } from './src/components/stadium/createStadiumActivity';
      export { createStadiumDrive } from './src/components/stadium/createStadiumDrive';
      export { createRoadRoute } from './src/components/stadium/stadiumRoads';
      export { getTrainPosition } from './src/components/stadium/createStadiumRailway';
      export { createOptimizedStadium } from './src/utils/models';
      export { getStadiumLayout } from './src/components/stadium/stadiumLayout';
    `,
    resolveDir: new URL('..', import.meta.url).pathname,
  },
  bundle: true, write: false, format: 'esm', platform: 'node', external: ['three'],
});
const source = bundle.outputFiles[0].text.replaceAll('"three"', JSON.stringify(import.meta.resolve('three')));
const { createStadiumSurroundings, createStadiumActivity, createStadiumDrive, createRoadRoute, getTrainPosition, createOptimizedStadium, getStadiumLayout } =
  await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('San Siro has four corner towers and snow caps; London has a working railway', () => {
  const milan = createStadiumSurroundings(0xff0000, 0x0000ff, 'san-siro');
  const towers = [];
  milan.traverse(object => { if (object.name === 'san-siro-corner-tower') towers.push(object); });
  assert.equal(towers.length, 4);
  assert.equal(new Set(towers.map(tower => `${tower.position.x},${tower.position.z}`)).size, 4);
  assert.ok(milan.getObjectByName('snow-covered-alpine-peaks'));
  assert.equal(milan.getObjectByName('snow-covered-alpine-peaks').count, 10);
  const canopy = milan.getObjectByName('san-siro-roof').children.find(mesh => mesh.material?.name === 'gray-concrete-canopy');
  assert.equal(canopy.material.color.getHex(), 0xaeb3b5);
  const london = createStadiumSurroundings(0xff0000, 0x0000ff, 'stamford-bridge');
  assert.equal(london.getObjectByName('snow-covered-alpine-peaks'), undefined);
  assert.equal(london.getObjectByName('connected-stadium-roads'), undefined);
  assert.ok(london.getObjectByName('stadium-pedestrian-plaza'));
  const activity = createStadiumActivity(0xff0000, 0x0000ff, 'stamford-bridge');
  assert.equal(activity.group.getObjectByName('stadium-road-traffic'), undefined);
  const train = activity.group.getObjectByName('arriving-london-train');
  assert.ok(train);
  const startZ = train.position.z;
  activity.update(4, true);
  assert.ok(train.position.z > startZ);
  activity.update(0, false);
  assert.equal(activity.group.visible, false);
});

test('San Siro has seating in the same corner on all floors and an aligned exterior', () => {
  const stadium = createStadiumSurroundings(0xff0000, 0x0000ff, 'san-siro');
  const bowl = stadium.getObjectByName('san-siro-rectangular-bowl');
  bowl.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(40, 30, -28), new THREE.Vector3(0, -1, 0));
  const floors = new Set(ray.intersectObject(bowl, true).map(hit => Math.floor(hit.point.y / 8)));
  assert.ok([0, 1, 2].every(floor => floors.has(floor)), 'all floors must fill the corner');
  const outerFaces = [4, 12, 20].map(y => {
    ray.set(new THREE.Vector3(60, y, 18), new THREE.Vector3(-1, 0, 0));
    return ray.intersectObject(bowl, true)[0].point.x;
  });
  assert.ok(outerFaces.every(x => Math.abs(x - outerFaces[0]) < 0.001), 'the floors must share one footprint');
});

test('multi-floor crowds fit inside each stadium canopy and occupy all four stands', () => {
  for (const [id, levels] of [['san-siro', 3], ['stamford-bridge', 2]]) {
    const layout = getStadiumLayout(id);
    const stadium = createOptimizedStadium(0xff0000, 0x0000ff, 0x2360c4, id);
    assert.equal(new Set(stadium.fanPositions.map(fan => Math.floor(fan.y / layout.floorRise))).size, levels);
    assert.equal(new Set(stadium.fanPositions.map(fan => fan.facing)).size, 4);
    for (const fan of stadium.fanPositions) {
      assert.ok(fan.y + 1 < layout.roofHeight, 'fans must remain below the canopy');
      assert.ok(Math.abs(fan.x) < layout.roofOuterX, 'seats must stay inside the roof footprint');
      assert.ok(Math.abs(fan.z - 28) < layout.roofOuterZ, 'end stands must stay inside the roof footprint');
    }
  }
});

test('Stamford Bridge has closed stand buildings, sloping decks and roof-only trusses', () => {
  const stadium = createStadiumSurroundings(0xff0000, 0x0000ff, 'stamford-bridge');
  const bowl = stadium.getObjectByName('stamford-bridge-enclosed-stands');
  const roof = stadium.getObjectByName('stamford-bridge-roof');
  assert.ok(bowl);
  assert.ok(roof.getObjectByName('roof-lattice-trusses'));
  assert.ok(new THREE.Box3().setFromObject(roof).min.y > 20, 'roof supports must not extend to the ground');
  bowl.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  for (const sign of [-1, 1]) {
    for (const y of [4, 12, 20]) {
      ray.set(new THREE.Vector3(sign * 65, y, 18), new THREE.Vector3(-sign, 0, 0));
      const hits = ray.intersectObject(bowl, true);
      assert.ok(hits.length > 0, 'each level must have an enclosed exterior');
      assert.ok(Math.abs(hits[0].point.x) >= 42);
    }
    for (const end of [-1, 1]) {
      ray.set(new THREE.Vector3(sign * 65, 12, 18 + end * 45), new THREE.Vector3(-sign, 0, 0));
      const hits = ray.intersectObject(bowl, true);
      assert.ok(hits.length > 0, 'the corner wings must close the gaps');
      assert.ok(Math.abs(hits[0].point.x) > 38);
    }
  }
  const positions = bowl.getObjectByName('continuous-seating-decks').geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 3) {
    const heights = [positions.getY(i), positions.getY(i + 1), positions.getY(i + 2)];
    assert.ok(Math.max(...heights) > Math.min(...heights), 'the seating banks must slope continuously');
  }
});

test('train decelerates to a stationary platform stop and loops beyond the fog', () => {
  assert.equal(getTrainPosition(36), 22);
  assert.equal(getTrainPosition(42), 22);
  assert.equal(getTrainPosition(48), 22);
  assert.ok(Math.abs(getTrainPosition(35.99) - 22) < 0.001);
  assert.ok(Math.abs(getTrainPosition(48.01) - 22) < 0.001);
  assert.ok(getTrainPosition(89.99) > 670);
  assert.ok(getTrainPosition(90) < -670);
});

test('the home camera completes a seamless circuit with matching position and orientation', () => {
  const camera = new THREE.PerspectiveCamera();
  const drive = createStadiumDrive(camera);
  const duration = createRoadRoute(-1.7).getLength() / 7;
  drive(0);
  const start = camera.position.clone();
  const direction = camera.quaternion.clone();
  drive(duration / 2);
  assert.ok(camera.position.distanceTo(start) > 100);
  drive(duration);
  assert.ok(camera.position.distanceTo(start) < 0.0001);
  assert.ok(camera.quaternion.angleTo(direction) < 0.0001);
  drive(duration - 0.001);
  const before = camera.position.clone();
  drive(duration + 0.001);
  assert.ok(camera.position.distanceTo(before) < 0.1);
});
