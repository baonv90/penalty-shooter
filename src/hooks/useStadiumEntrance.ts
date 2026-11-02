import { useCallback } from "react";
import * as THREE from "three";
import { createStadiumAmbience } from "../utils/stadiumAmbience";

/** Runs inside the existing render loop; no extra RAF or per-frame React updates. */
export function useStadiumEntrance() {
  return useCallback((camera: THREE.PerspectiveCamera, options: {
    shouldSkip: () => boolean;
    onComplete: () => void;
  }) => {
    const route = new THREE.CatmullRomCurve3([
      new THREE.Vector3(96, 82, 110),
      new THREE.Vector3(58, 46, 74),
      new THREE.Vector3(16, 24, 35),
      new THREE.Vector3(2, 9, 18),
      new THREE.Vector3(0, 3.5, 9),
    ]);
    const focus = new THREE.Vector3();
    const startFocus = new THREE.Vector3(0, 0, 18);
    const finalFocus = new THREE.Vector3(0, 1.2, -4);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ambience = reducedMotion ? undefined : createStadiumAmbience();
    let elapsed = 0;
    let finished = false;
    camera.position.copy(route.points[0]);
    camera.lookAt(startFocus);

    const update = (delta: number) => {
      if (finished) return false;
      elapsed += delta;
      const progress = reducedMotion || options.shouldSkip() ? 1 : Math.min(elapsed / 9, 1);
      ambience?.update(progress);
      // Quintic easing gives the camera zero velocity/acceleration at both ends.
      const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
      route.getPoint(eased, camera.position);
      focus.lerpVectors(startFocus, finalFocus, eased);
      camera.lookAt(focus);
      if (progress === 1) {
        finished = true;
        ambience?.stop();
        options.onComplete();
      }
      return !finished;
    };
    return Object.assign(update, { dispose: () => ambience?.stop() });
  }, []);
}
