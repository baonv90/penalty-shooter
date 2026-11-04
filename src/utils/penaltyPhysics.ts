import * as THREE from "three";

export const BALL_RADIUS = 0.15;
export type ShotOutcome = "goal" | "save" | "post" | "miss";

interface CollisionNode {
  bounds: THREE.Box3;
  indices?: number[];
  left?: CollisionNode;
  right?: CollisionNode;
}

// Geometry is shared by animal body parts; build its local acceleration tree once.
const collisionTrees = new WeakMap<THREE.BufferGeometry, CollisionNode>();
function getCollisionTree(geometry: THREE.BufferGeometry): CollisionNode {
  const cached = collisionTrees.get(geometry);
  if (cached) return cached;
  const positions = geometry.attributes.position;
  const index = geometry.index;
  const point = new THREE.Vector3();
  const count = index ? index.count : positions.count;
  const boxes: THREE.Box3[] = [];
  for (let i = 0; i < count; i += 3) {
    const box = new THREE.Box3();
    for (let j = 0; j < 3; j++) {
      point.fromBufferAttribute(positions, index ? index.getX(i + j) : i + j);
      box.expandByPoint(point);
    }
    boxes.push(box);
  }
  const build = (indices: number[]): CollisionNode => {
    const bounds = new THREE.Box3();
    for (const i of indices) bounds.union(boxes[i]);
    if (indices.length <= 12) return { bounds, indices };
    const size = bounds.getSize(new THREE.Vector3());
    const axis = size.x >= size.y && size.x >= size.z ? "x" : size.y >= size.z ? "y" : "z";
    indices.sort((a, b) => boxes[a].min[axis] + boxes[a].max[axis] - boxes[b].min[axis] - boxes[b].max[axis]);
    const middle = indices.length >> 1;
    return { bounds, left: build(indices.slice(0, middle)), right: build(indices.slice(middle)) };
  };
  const tree = build(boxes.map((_, i) => i));
  collisionTrees.set(geometry, tree);
  return tree;
}

/** A swept sphere against posed triangles, filtered by cached local geometry trees. */
export function createKeeperCollision(root: THREE.Object3D) {
  const meshes: { mesh: THREE.Mesh; tree: CollisionNode; inverse: THREE.Matrix4; bounds: THREE.Box3; radiusScale: number }[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh && object.geometry.attributes.position) {
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      meshes.push({ mesh: object, tree: getCollisionTree(object.geometry),
        inverse: new THREE.Matrix4(), bounds: new THREE.Box3(), radiusScale: 1 });
    }
  });
  const prepare = () => {
    root.updateWorldMatrix(true, true);
    for (const entry of meshes) {
      entry.bounds.copy(entry.mesh.geometry.boundingBox!).applyMatrix4(entry.mesh.matrixWorld);
      entry.inverse.copy(entry.mesh.matrixWorld).invert();
      const m = entry.inverse.elements;
      // Frobenius norm conservatively bounds inverse scale, including nonuniform scale/shear.
      entry.radiusScale = Math.hypot(m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]);
    }
  };
  const localStart = new THREE.Vector3();
  const localEnd = new THREE.Vector3();
  const localSweep = new THREE.Box3();
  const stack: CollisionNode[] = [];
  const sweepBounds = new THREE.Box3();
  const triangle = new THREE.Triangle();
  const ray = new THREE.Ray();
  const closest = new THREE.Vector3();
  const onRay = new THREE.Vector3();
  const onEdge = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const intersection = new THREE.Vector3();
  const edges = [[triangle.a, triangle.b], [triangle.b, triangle.c], [triangle.c, triangle.a]];

  const collide = (start: THREE.Vector3, end: THREE.Vector3, radius = BALL_RADIUS, prepared = false) => {
    if (!prepared) prepare();
    sweepBounds.makeEmpty().expandByPoint(start).expandByPoint(end).expandByScalar(radius);
    const length = direction.subVectors(end, start).length();
    ray.set(start, direction.normalize());
    const radiusSq = radius * radius;
    for (const entry of meshes) {
      if (!entry.bounds.intersectsBox(sweepBounds)) continue;
      const { mesh } = entry;
      localStart.copy(start).applyMatrix4(entry.inverse);
      localEnd.copy(end).applyMatrix4(entry.inverse);
      localSweep.makeEmpty().expandByPoint(localStart).expandByPoint(localEnd).expandByScalar(radius * entry.radiusScale);
      const positions = mesh.geometry.attributes.position;
      const index = mesh.geometry.index;
      stack.length = 0;
      stack.push(entry.tree);
      while (stack.length) {
        const node = stack.pop()!;
        if (!node.bounds.intersectsBox(localSweep)) continue;
        if (!node.indices) {
          stack.push(node.left!, node.right!);
          continue;
        }
        for (const triangleIndex of node.indices) {
          const i = triangleIndex * 3;
          triangle.a.fromBufferAttribute(positions, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
          triangle.b.fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1).applyMatrix4(mesh.matrixWorld);
          triangle.c.fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2).applyMatrix4(mesh.matrixWorld);
          if (triangle.closestPointToPoint(start, closest).distanceToSquared(start) <= radiusSq ||
              triangle.closestPointToPoint(end, closest).distanceToSquared(end) <= radiusSq) return true;
          if (length === 0) continue;
          if (ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, intersection) &&
              intersection.distanceToSquared(start) <= length * length) return true;
          for (const [a, b] of edges) {
            const distanceSq = ray.distanceSqToSegment(a, b, onRay, onEdge);
            if (distanceSq <= radiusSq && onRay.distanceToSquared(start) <= length * length) return true;
          }
        }
      }
    }
    return false;
  };
  return Object.assign(collide, { prepare });
}

/** Dispose shared GPU resources only once, including material textures. */
export function disposeScene(scene: THREE.Object3D) {
  const resources = new Set<{ dispose: () => void }>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.LineSegments)) return;
    resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      resources.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) resources.add(value as THREE.Texture);
      }
    }
  });
  resources.forEach((resource) => resource.dispose());
}
