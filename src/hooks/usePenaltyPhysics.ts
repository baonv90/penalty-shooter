import { useCallback, useRef } from "react";
import type { Penalty3DProps } from "../components/Penalty3D";
import { createGoalkeeper, animateGoalkeeper, type GKData } from "../utils/goalkeepers";
import { BALL_RADIUS, createKeeperCollision, disposeScene } from "../utils/penaltyPhysics";
import * as THREE from "three";
import { jerseyNumberColor } from "../utils/jersey";
import { getHexColor } from "../utils/textures";
import { animateKicker, KICK_CONTACT_TIME } from "../utils/playerAnimation";
import { GOAL, SHOT_GRAVITY, launchShot, keeperReaction, isInsideGoal, constrainScoredBall } from "../utils/shotSimulation";
import { playCheer, playGroan, playKick } from "../utils/audio";
import { StadiumData } from "../utils/models";

export interface PhysicsElements {
  updateNet?: (intensity: number) => void;
  updateAmbience?: (time: number, entering: boolean, celebrating: boolean) => void;
  updateSurroundings?: (delta: number, active: boolean) => void;
  updateEntrance?: (delta: number) => boolean;
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  ballGroup: THREE.Group;
  pGroup: THREE.Group;
  gkGroup: THREE.Group;
  goalFrame: THREE.Group;
  aimArrowGroup: THREE.Group;
  timingRingGroup: THREE.Group;
  net: THREE.Group;
  kicker: ReturnType<typeof import("../utils/models").createHumanoid>;
  gkData: GKData;
  smokeGroup?: THREE.Group;
  pShirtMat: THREE.MeshStandardMaterial;
  pNumberMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  innerCircleMat: THREE.MeshBasicMaterial;
  stadiumData: StadiumData;
}

export function usePenaltyPhysics(propsRef: React.MutableRefObject<Penalty3DProps>) {
  const stateRef = useRef({
    hasBounced: false,
    ballStartKick: false,
    reboundVel: new THREE.Vector3(),
    netBulgeTime: 0,
    currentJerseyHex: 0,
  });

  const startAnimation = useCallback((elements: PhysicsElements) => {
    let animId: number;
    const clock = new THREE.Clock();
    const state = stateRef.current;

    // Khởi tạo màu áo gốc
    state.currentJerseyHex = getHexColor(propsRef.current.jerseyColor);

    // --- KHAI BÁO CÁC BIẾN VA CHẠM VẬT LÝ ---
    let collidesWithKeeper = createKeeperCollision(elements.gkGroup);
    const contactPoint = new THREE.Vector3();
    const frameCollision = createKeeperCollision(elements.goalFrame);
    let shotElapsed = 0;
    let flightElapsed = 0;
    let hitPost = false;
    let postCooldown = 0;
    const divePose = { elapsed: 0, duration: 0.4, targetY: 1, targetX: 0 };
    const findContact = (start: THREE.Vector3, end: THREE.Vector3, collide: typeof frameCollision) => {
      if (!collide(start, end, BALL_RADIUS, true)) return Infinity;
      let low = 0;
      let high = 1;
      for (let i = 0; i < 7; i++) {
        const middle = (low + high) / 2;
        contactPoint.lerpVectors(start, end, middle);
        if (collide(start, contactPoint, BALL_RADIUS, true)) high = middle;
        else low = middle;
      }
      return high;
    };
    const nextPosition = new THREE.Vector3();
    const direction = new THREE.Vector3();
    let keeperType = propsRef.current.gkType;
    let lastCrowdUpdate = -Infinity;
    let resolved = false;
    let goalScored = false;
    const resolve = (outcome: import("../utils/penaltyPhysics").ShotOutcome) => {
      if (resolved) return;
      resolved = true;
      goalScored = outcome === "goal";
      propsRef.current.onShotResolved?.(outcome);
    };

    const phaseIsGoal = () => propsRef.current.phase === "result" && goalScored;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      if (document.hidden) return;
      const time = clock.elapsedTime;
      const entering = elements.updateEntrance?.(delta) ?? false;
      elements.updateSurroundings?.(delta, entering);
      elements.updateAmbience?.(time, entering, phaseIsGoal());

      // Replace only the keeper; preserve the renderer, pitch, stadium and textures.
      if (propsRef.current.gkType !== keeperType) {
        keeperType = propsRef.current.gkType;
        elements.gkGroup.remove(elements.gkData.group);
        disposeScene(elements.gkData.group);
        elements.gkData = createGoalkeeper(keeperType);
        elements.gkData.group.scale.setScalar(elements.gkData.scale);
        elements.gkGroup.position.set(0, 0, -3.9);
        elements.gkGroup.add(elements.gkData.group);
        collidesWithKeeper = createKeeperCollision(elements.gkGroup);
      }
      const {
        phase,
        ballTarget,
        gkTargetX,
        jerseyColor,
      } = propsRef.current;
      const {
        scene,
        camera,
        renderer,
        ballGroup,
        pGroup,
        gkGroup,
        aimArrowGroup,
        timingRingGroup,
        kicker,
        gkData,
        smokeGroup,
        pShirtMat,
        pNumberMat,
        ringMat,
        innerCircleMat,
      } = elements;

      const aimValue = propsRef.current.controlsRef?.current.aimValue ?? propsRef.current.aimValue;
      const scaleValue = propsRef.current.controlsRef?.current.scaleValue ?? propsRef.current.scaleValue;

      // --- 1. HIỆU ỨNG KHÓI CHO CHỒN (SKUNK) ---
      if (smokeGroup) smokeGroup.visible = !entering && keeperType === "skunk";
      if (smokeGroup?.visible) {
        smokeGroup.rotation.z += delta * 0.5; // Xoay vòng từ từ
        smokeGroup.children.forEach((child, idx) => {
          // Phình to thu nhỏ liên tục tạo cảm giác mờ ảo
          const s = 1 + Math.sin(time * 3 + idx) * 0.25;
          child.scale.set(s, s, s);
        });
      }

      // Xử lý áo thay đổi màu
      const targetHex = getHexColor(jerseyColor);
      if (state.currentJerseyHex !== targetHex) {
        state.currentJerseyHex = targetHex;
        pShirtMat.color.setHex(targetHex);
        pNumberMat.color.setHex(jerseyNumberColor(targetHex));
      }

      // NHỊP 1: Định hướng
      aimArrowGroup.visible = !entering && !propsRef.current.introActive && phase === "aiming";
      aimArrowGroup.rotation.y = (aimValue - 0.5) * -Math.PI * 0.8;

      // NHỊP 2: Vòng canh nhịp 3D
      timingRingGroup.visible = !entering && phase === "timing";
      if (phase === "timing") {
        const currentScale = scaleValue ?? 1;
        timingRingGroup.scale.set(currentScale, currentScale, currentScale);

        let ringHexColor = 0xef4444;
        if (currentScale <= 1.3 && currentScale >= 0.7) ringHexColor = 0x22c55e;
        else if (currentScale <= 1.8) ringHexColor = 0xfacc15;

        ringMat.color.setHex(ringHexColor);
        innerCircleMat.color.setHex(ringHexColor);
      }

      const shooting = phase === "shooting" || phase === "result";
      const wasKicked = state.ballStartKick;
      if (shooting) {
        shotElapsed += delta;
        animateKicker(kicker, pGroup, shotElapsed, ballTarget[0]);
        if (!state.ballStartKick && shotElapsed >= KICK_CONTACT_TIME) {
          state.ballStartKick = true;
          launchShot(state.reboundVel, ballTarget, propsRef.current.shotSpeed ?? 19);
          playKick();
        }
      } else {
        shotElapsed = 0;
        flightElapsed = 0;
        hitPost = false;
        postCooldown = 0;
        state.ballStartKick = false;
        state.hasBounced = false;
        resolved = false;
        goalScored = false;
        state.netBulgeTime = 0;
        ballGroup.position.set(0, BALL_RADIUS, 2);
        ballGroup.rotation.set(0, 0, 0);
        state.reboundVel.set(0, 0, 0);
        animateKicker(kicker, pGroup, -1, 0);
        gkGroup.position.set(0, 0, -3.9);
      }

      // A committed, delayed push-off: the keeper cannot follow subsequent ball movement.
      const reaction = keeperReaction(propsRef.current.difficulty ?? "medium", gkData.speedMultiplier);
      const diveElapsed = shotElapsed - KICK_CONTACT_TIME - reaction;
      if (shooting && diveElapsed >= 0) {
        divePose.elapsed = diveElapsed;
        divePose.duration = 0.4 / Math.sqrt(gkData.speedMultiplier);
        divePose.targetX = gkTargetX ?? 0;
        divePose.targetY = ballTarget[1];
        const progress = THREE.MathUtils.clamp(diveElapsed / divePose.duration, 0, 1);
        gkGroup.position.x = divePose.targetX * THREE.MathUtils.smoothstep(progress, 0, 1);
        animateGoalkeeper(gkData, time, delta, true, gkGroup.position.x, divePose);
      } else {
        animateGoalkeeper(gkData, time, delta, false, 0);
      }

      if (state.ballStartKick) {
        // Small integration steps keep gravity, ground bounces and collisions stable on slow frames.
        let remaining = wasKicked ? delta : Math.max(0, shotElapsed - KICK_CONTACT_TIME);
        if (!state.hasBounced) {
          collidesWithKeeper.prepare();
          frameCollision.prepare();
        }
        while (remaining > 0.000001) {
          const step = Math.min(remaining, 1 / 120);
          remaining -= step;
          flightElapsed += step;
          postCooldown = Math.max(0, postCooldown - step);
          nextPosition.copy(ballGroup.position).addScaledVector(state.reboundVel, step);
          nextPosition.y -= 0.5 * SHOT_GRAVITY * step * step;
          state.reboundVel.y -= SHOT_GRAVITY * step;
          if (nextPosition.y < BALL_RADIUS) {
            nextPosition.y = BALL_RADIUS;
            state.reboundVel.y = Math.abs(state.reboundVel.y) * 0.45;
            state.reboundVel.x *= 0.96;
            state.reboundVel.z *= 0.96;
          }
          if (!state.hasBounced) {
            // Only check contacts up to the instant the whole ball crosses the goal line.
            const scoringZ = GOAL.z - BALL_RADIUS;
            const crossing = ballGroup.position.z > scoringZ && nextPosition.z <= scoringZ;
            const lineFraction = crossing ? (scoringZ - ballGroup.position.z) / (nextPosition.z - ballGroup.position.z) : 1;
            if (crossing) nextPosition.lerpVectors(ballGroup.position, nextPosition, lineFraction);
            const keeperHit = findContact(ballGroup.position, nextPosition, collidesWithKeeper);
            const postHit = postCooldown > 0 ? Infinity : findContact(ballGroup.position, nextPosition, frameCollision);
            if (keeperHit !== Infinity || postHit !== Infinity) {
              const save = keeperHit < postHit;
              ballGroup.position.lerp(nextPosition, Math.min(keeperHit, postHit));
              state.hasBounced = save;
              if (save) {
                // Parry follows incoming momentum, with a small sideways deflection.
                state.reboundVel.x = state.reboundVel.x * 0.35 + Math.sign(ballGroup.position.x - gkGroup.position.x || 1) * 2;
                state.reboundVel.y = Math.max(1.5, Math.abs(state.reboundVel.y) * 0.4);
                state.reboundVel.z = Math.abs(state.reboundVel.z) * 0.4;
              } else {
                hitPost = true;
                postCooldown = 0.045;
                // Reflect around the nearest post/crossbar axis instead of a random bounce.
                contactPoint.set(
                  Math.abs(Math.abs(ballGroup.position.x) - GOAL.halfWidth) < Math.abs(ballGroup.position.y - GOAL.height)
                    ? Math.sign(ballGroup.position.x) * GOAL.halfWidth : ballGroup.position.x,
                  Math.abs(Math.abs(ballGroup.position.x) - GOAL.halfWidth) < Math.abs(ballGroup.position.y - GOAL.height)
                    ? THREE.MathUtils.clamp(ballGroup.position.y, 0, GOAL.height) : GOAL.height,
                  GOAL.z
                );
                direction.subVectors(ballGroup.position, contactPoint).normalize();
                state.reboundVel.reflect(direction).multiplyScalar(0.65);
              }
              playGroan();
              if (save) resolve("save");
            } else {
              ballGroup.position.copy(nextPosition);
              if (crossing) {
                state.hasBounced = true;
                if (isInsideGoal(ballGroup.position.x, ballGroup.position.y, BALL_RADIUS)) {
                  resolve("goal");
                  playCheer();
                  state.reboundVel.multiplyScalar(0.65);
                } else {
                  resolve(hitPost ? "post" : "miss");
                  playGroan();
                }
              }
            }
          } else {
            ballGroup.position.copy(nextPosition);
          }
          if (goalScored && constrainScoredBall(ballGroup.position, state.reboundVel, BALL_RADIUS)) {
            state.netBulgeTime = 0.25;
          }
          if (ballGroup.position.y < BALL_RADIUS) {
            ballGroup.position.y = BALL_RADIUS;
            state.reboundVel.y = Math.abs(state.reboundVel.y) * 0.45;
            state.reboundVel.x *= 0.96;
            state.reboundVel.z *= 0.96;
          }
          ballGroup.rotation.x += state.reboundVel.z * step / BALL_RADIUS;
          ballGroup.rotation.z -= state.reboundVel.x * step / BALL_RADIUS;
          if (!resolved && (flightElapsed > 3 || (flightElapsed > 0.3 && ballGroup.position.z > 3.5))) {
            state.hasBounced = true;
            resolve(hitPost ? "post" : "miss");
            playGroan();
          }
        }
      }

      if (state.netBulgeTime > 0) state.netBulgeTime = Math.max(0, state.netBulgeTime - delta);
      elements.updateNet?.(state.netBulgeTime / 0.25);

      // Background crowd updates at 30 Hz; gameplay still renders every frame.
      if (time - lastCrowdUpdate >= 1 / 30) {
        lastCrowdUpdate = time;
        elements.stadiumData.updateCrowd?.(time, phase === "result" && goalScored);

      }

      renderer.render(scene, camera);
    };

    animate();

    return () => cancelAnimationFrame(animId);
  }, [propsRef]);

  return { startAnimation };
}
