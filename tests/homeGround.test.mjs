import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';

const bundle = await build({
  stdin: {
    contents: `
      export { createStadiumSurroundings } from './src/components/stadium/createStadiumSurroundings';
      export { createStadiumMiniature } from './src/components/stadium/createStadiumMiniature';
      export { createStadiumActivity } from './src/components/stadium/createStadiumActivity';
      export { createOptimizedStadium } from './src/utils/models';
      export { createFieldGrass, createFieldMarkings } from './src/utils/pitch';
      export { HOME_GROUND_PITCH as FIELD, HOME_GROUND_BOULEVARD } from './src/components/stadium/homeGroundLayout';
      export { getGameCameraFov, getGameCameraPosition } from './src/utils/gameViewport';
      export { createStadiumAmbience } from './src/utils/stadiumAmbience';
    `,
    resolveDir: new URL('..', import.meta.url).pathname,
  },
  bundle: true, write: false, format: 'esm', platform: 'node', external: ['three'],
});
const source = bundle.outputFiles[0].text.replaceAll('"three"', JSON.stringify(import.meta.resolve('three')));
const { createStadiumSurroundings, createStadiumMiniature, createStadiumActivity, createOptimizedStadium,
  createFieldGrass, createFieldMarkings, FIELD, HOME_GROUND_BOULEVARD, getGameCameraFov, getGameCameraPosition,
  createStadiumAmbience } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('Home ground preserves the reference layout and keeps architecture clear of the playing area', () => {
  const site = createStadiumSurroundings(0xff0000, 0x0000ff, 'home-ground');
  site.updateMatrixWorld(true);
  const bounds = name => new THREE.Box3().setFromObject(site.getObjectByName(name));
  const rear = bounds('home-ground-rear-residence');
  const front = bounds('home-ground-front-two-storey-villa');
  const parking = bounds('home-ground-front-parking');
  assert.ok(rear.max.z < FIELD.nearZ);
  assert.ok(front.getCenter(new THREE.Vector3()).z > parking.max.z && parking.min.z > FIELD.farZ);
  assert.ok(rear.getSize(new THREE.Vector3()).x > front.getSize(new THREE.Vector3()).x);
  assert.ok(bounds('home-ground-left-parking').max.x < -FIELD.width / 2);
  assert.ok(bounds('home-ground-descending-driveway').getCenter(new THREE.Vector3()).x > FIELD.width / 2);
  assert.ok(site.getObjectByName('home-ground-wooden-covered-parking'));
  assert.ok(site.getObjectByName('home-ground-gray-parked-car'));
  const pitchAirspace = new THREE.Box3(new THREE.Vector3(-FIELD.width / 2, 0.2, FIELD.nearZ), new THREE.Vector3(FIELD.width / 2, 30, FIELD.farZ));
  for (const tree of site.getObjectByName('home-ground-blooming-cherry-trees').children.filter(child => child.isGroup)) {
    assert.equal(new THREE.Box3().setFromObject(tree).intersectsBox(pitchAirspace), false);
  }
  // A downward ray beside the roof must hit the lower ramp, not an overlaid terrain plane.
  const ray = new THREE.Raycaster(new THREE.Vector3(26, 5, 23), new THREE.Vector3(0, -1, 0));
  const hit = ray.intersectObject(site, true)[0];
  assert.equal(hit.object.material.name, 'parking-asphalt');
  assert.ok(hit.point.y < -0.4);
});

test('Home ground has no crowd or arriving supporters, and keeps traffic outside the residence', () => {
  const crowd = createOptimizedStadium(0xff0000, 0x0000ff, 0x738e66, 'home-ground');
  assert.deepEqual(crowd.fanPositions, []);
  assert.equal(crowd.flagCount, 0);
  assert.equal(crowd.bodiesInstanced.count, 0);
  const activity = createStadiumActivity(0xff0000, 0x0000ff, 'home-ground');
  activity.update(10, true);
  assert.equal(activity.group.getObjectByName('arriving-supporters'), undefined);
  const bodies = activity.group.getObjectByName('boulevard-car-bodies');
  assert.equal(bodies.count, 10);
  const matrix = new THREE.Matrix4();
  const positions = [];
  for (let i = 0; i < bodies.count; i++) {
    bodies.getMatrixAt(i, matrix);
    const position = new THREE.Vector3().setFromMatrixPosition(matrix);
    positions.push(position);
    assert.ok(Math.abs(position.z - HOME_GROUND_BOULEVARD.centerZ) < HOME_GROUND_BOULEVARD.roadWidth / 2);
    assert.ok(position.z > 58, 'cars stay outside the residence wall');
  }
  assert.equal(new Set(positions.map(position => position.z)).size, 2);
  activity.update(1, true);
  for (let i = 0; i < bodies.count; i++) {
    bodies.getMatrixAt(i, matrix);
    const position = new THREE.Vector3().setFromMatrixPosition(matrix);
    assert.ok((position.x - positions[i].x) * (i % 2 ? 1 : -1) > 0, 'cars move in opposite directions');
  }
  activity.update(1, false);
  assert.equal(activity.group.visible, false);
  // This also verifies the quiet venue never tries to create a browser AudioContext.
  const ambience = createStadiumAmbience(false);
  ambience.update(0.5); ambience.updateMatch(10, true); ambience.setSuspended(true); ambience.stop();
  const mini = createStadiumMiniature('home-ground');
  assert.ok(mini.getObjectByName('home-ground-front-two-storey-villa'));
  assert.ok(mini.getObjectByName('home-ground-rear-residence'));
  assert.ok(mini.getObjectByName('pitch-markings'));
  assert.ok(mini.getObjectByName('home-ground-practice-goal'));
});

test('Home ground is a small single-color, single-goal court with no overlapping edge paving', () => {
  const grass = createFieldGrass('home-ground');
  const bounds = new THREE.Box3().setFromObject(grass);
  assert.equal(grass.children.length, 1, 'grass uses one surface, with no mowing stripe overlay');
  assert.equal(bounds.getSize(new THREE.Vector3()).x, 20);
  assert.equal(bounds.getSize(new THREE.Vector3()).z, 18);
  const markings = createFieldMarkings('home-ground');
  assert.equal(markings.children.length, 2, 'only court/goal-box lines and one penalty spot');
  const scene = createStadiumSurroundings(0xff0000, 0x0000ff, 'home-ground');
  scene.add(grass); scene.updateMatrixWorld(true);
  assert.equal(scene.getObjectByName('home-ground-far-goal'), undefined);
  assert.equal(markings.children[0].count, 7, 'the compact court keeps four boundary lines and three goal-box lines');
  for (const x of [-9.98, 9.98]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 3, 5), new THREE.Vector3(0, -1, 0));
    const hits = ray.intersectObject(scene, true);
    assert.equal(hits[0].object, grass.children[0]);
    assert.ok(hits[0].point.y - hits[1].point.y > 0.1, 'the terrain is well below the grass edge');
  }
});

test('Home ground has fewer villa windows, trees behind the goal and fenced neighboring maisons', () => {
  const site = createStadiumSurroundings(0xff0000, 0x0000ff, 'home-ground');
  const rear = site.getObjectByName('home-ground-rear-residence');
  const front = site.getObjectByName('home-ground-front-two-storey-villa');
  assert.ok(rear.getObjectByName('blue-gray-window-glass').count <= 90);
  assert.ok(front.getObjectByName('blue-gray-window-glass').count <= 44);
  const trees = site.getObjectByName('home-ground-blooming-cherry-trees').children;
  assert.ok(trees.some(tree => tree.isGroup && Math.abs(tree.position.x) < 1 && tree.position.z < FIELD.nearZ));
  assert.ok(site.getObjectByName('home-ground-residence-boundary'));
  assert.equal(site.getObjectByName('home-ground-surrounding-maisons').children.filter(child => child.userData.maison).length, 10);
  assert.ok(new THREE.Box3().setFromObject(site.getObjectByName('home-ground-boulevard')).min.z >
    new THREE.Box3().setFromObject(front).max.z);
});

test('the closer Home ground camera keeps the goal, ball and kicker in view on portrait and wide screens', () => {
  for (const aspect of [320 / 690, 390 / 730, 1440 / 780, 2560 / 970]) {
    assert.ok(getGameCameraFov(aspect, 'home-ground') > getGameCameraFov(aspect));
    const previousFov = Math.atan(Math.tan(62 * Math.PI / 360) * Math.max(1, (16 / 9) / aspect)) * 360 / Math.PI;
    assert.ok(getGameCameraFov(aspect, 'home-ground') < previousFov, 'the view zooms in from the previous wide lens');
    const camera = new THREE.PerspectiveCamera(getGameCameraFov(aspect, 'home-ground'), aspect, 0.1, 800);
    camera.position.set(...getGameCameraPosition('home-ground')); camera.lookAt(0, 1.2, -4); camera.updateMatrixWorld(true);
    for (const point of [[-3.74, 0, -4.04], [3.74, 2.52, -4.04], [0, 0.15, 2], [1.5, 0, 4.5]]) {
      const projected = new THREE.Vector3(...point).project(camera);
      assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1);
    }
  }
});

test('the rear residence has two floors, broad triangular gables and balconies on the upper floor', () => {
  const site = createStadiumSurroundings(0xff0000, 0x0000ff, 'home-ground');
  const rear = site.getObjectByName('home-ground-rear-residence');
  const walls = rear.getObjectByName('rear-residence-pale-yellow-stucco');
  const matrix = new THREE.Matrix4();
  assert.equal(walls.count, 3);
  for (let i = 0; i < walls.count; i++) {
    walls.getMatrixAt(i, matrix);
    assert.ok(Math.abs(new THREE.Vector3().setFromMatrixScale(matrix).y - 6.3) < 0.001, 'each wing has exactly two 3.15 m floors');
  }
  const roofs = rear.children.filter(child => child.name === 'obtuse-gable-red-tile-roof');
  assert.equal(roofs.length, 3);
  assert.equal(rear.getObjectByName('hipped-red-tile-roof'), undefined);
  const gables = rear.children.filter(child => child.name === 'triangular-red-tile-gable');
  assert.equal(gables.length, 3);
  for (const gable of gables) assert.equal(gable.material.name, 'red-terracotta-roof-tiles', 'the triangular interior uses the same red tiles as the slopes');
  for (const roof of roofs) {
    roof.geometry.computeBoundingBox();
    const bounds = roof.geometry.boundingBox;
    const centerX = (bounds.min.x + bounds.max.x) / 2;
    const rise = bounds.max.y - bounds.min.y;
    assert.ok(2 * Math.atan((bounds.max.x - centerX) / rise) > Math.PI / 2, 'the triangular apex is obtuse');
    const positions = roof.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      if (Math.abs(positions.getY(i) - bounds.max.y) < 0.001) assert.ok(Math.abs(positions.getX(i) - centerX) < 0.001);
    }
  }
  // Each shuttered upper-floor window has an individual balcony, including side elevations.
  const balconies = rear.getObjectByName('red-corner-quoins-and-balconies');
  let balconyPanels = 0;
  for (let i = 0; i < balconies.count; i++) {
    balconies.getMatrixAt(i, matrix);
    if (Math.abs(new THREE.Vector3().setFromMatrixScale(matrix).y - 0.38) < 0.001) balconyPanels++;
  }
  assert.equal(balconyPanels, rear.getObjectByName('blue-gray-window-glass').count / 2);
});

test('parked cars occupy the front, left and covered bays without obstructing the court or each other', () => {
  const site = createStadiumSurroundings(0xff0000, 0x0000ff, 'home-ground');
  site.updateMatrixWorld(true);
  const cars = [];
  site.traverse(object => { if (object.userData.parkedCar) cars.push(object); });
  assert.equal(cars.length, 10);
  assert.equal(cars.filter(car => car.parent.name === 'home-ground-front-parking').length, 4);
  assert.equal(cars.filter(car => car.parent.name === 'home-ground-left-parking').length, 4);
  assert.equal(cars.filter(car => car.parent.name === 'home-ground-wooden-covered-parking').length, 2);
  const court = new THREE.Box3(new THREE.Vector3(-10, 0, -6.02), new THREE.Vector3(10, 3, 11.98));
  const carBounds = cars.map(car => new THREE.Box3().setFromObject(car));
  for (let i = 0; i < carBounds.length; i++) {
    assert.equal(carBounds[i].intersectsBox(court), false);
    for (let j = i + 1; j < carBounds.length; j++) assert.equal(carBounds[i].intersectsBox(carBounds[j]), false);
  }
});

test('larger varied maisons form close rows beside the residence, with no homes across the boulevard', () => {
  const site = createStadiumSurroundings(0xff0000, 0x0000ff, 'home-ground');
  site.updateMatrixWorld(true);
  const neighborhood = site.getObjectByName('home-ground-surrounding-maisons');
  const maisons = neighborhood.children.filter(child => child.userData.maison);
  assert.equal(maisons.length, 10);
  assert.equal(new Set(maisons.map(maison => maison.userData.style)).size, 5);
  for (const maison of maisons) {
    const building = new THREE.Box3().setFromObject(maison.getObjectByName('maison-building'));
    const size = building.getSize(new THREE.Vector3());
    assert.ok(size.x > 16 && size.z > 15 && size.y > 10, 'new houses are substantial two-storey/attic or three-storey buildings');
    assert.ok(building.max.z < HOME_GROUND_BOULEVARD.centerZ - HOME_GROUND_BOULEVARD.roadWidth / 2,
      'all houses remain on the residence side of the boulevard');
  }
  for (const side of [-1, 1]) {
    const row = maisons.filter(maison => Math.sign(maison.position.x) === side).sort((a, b) => a.position.z - b.position.z);
    for (let i = 1; i < row.length; i++) {
      const before = new THREE.Box3().setFromObject(row[i - 1].getObjectByName('maison-building'));
      const after = new THREE.Box3().setFromObject(row[i].getObjectByName('maison-building'));
      const gap = after.min.z - before.max.z;
      assert.ok(gap > 0 && gap < 5, 'neighboring houses are close without intersecting');
    }
  }
  const trees = site.getObjectByName('home-ground-golden-garden-trees');
  assert.equal(trees.children.length, 20);
  for (const tree of trees.children) {
    assert.ok(tree.getObjectByName('dense-yellow-leaf-canopy').count > 1000);
    assert.ok(tree.getObjectByName('fallen-golden-leaves').count > 100);
  }
  assert.ok(site.getObjectByName('home-ground-private-garden-borders'));
});
