import * as THREE from "three";

export const BALL_RADIUS = 0.15;
export type ShotOutcome = "goal" | "save" | "post" | "miss";

/** A swept sphere against the actual posed mesh triangles, with per-mesh broad phase. */
export function createKeeperCollision(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh && object.geometry.attributes.position) {
      object.geometry.computeBoundingBox();
      meshes.push(object);
    }
  });
  const bounds = new THREE.Box3();
  const sweepBounds = new THREE.Box3();
  const triangle = new THREE.Triangle();
  const ray = new THREE.Ray();
  const closest = new THREE.Vector3();
  const onRay = new THREE.Vector3();
  const onEdge = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const intersection = new THREE.Vector3();
  const edges = [[triangle.a, triangle.b], [triangle.b, triangle.c], [triangle.c, triangle.a]];


  return (start: THREE.Vector3, end: THREE.Vector3, radius = BALL_RADIUS) => {
    root.updateWorldMatrix(true, true);
    sweepBounds.setFromPoints([start, end]).expandByScalar(radius);
    const length = direction.subVectors(end, start).length();
    ray.set(start, direction.normalize());
    const radiusSq = radius * radius;
    for (const mesh of meshes) {
      bounds.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
      if (!bounds.intersectsBox(sweepBounds)) continue;
      const positions = mesh.geometry.attributes.position;
      const index = mesh.geometry.index;
      const count = index ? index.count : positions.count;
      for (let i = 0; i < count; i += 3) {
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
    return false;
  };
}

/** Dispose shared GPU resources only once, including material textures. */
export function disposeScene(scene: THREE.Scene) {
  const resources = new Set<{ dispose: () => void }>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
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
