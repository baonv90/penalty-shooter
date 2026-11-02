import { useCallback, useRef } from "react";
import type { Penalty3DProps } from "../components/Penalty3D";
import { createGoalkeeper, animateGoalkeeper, type GKData } from "../utils/goalkeepers";
import { BALL_RADIUS, createKeeperCollision, disposeScene } from "../utils/penaltyPhysics";
import * as THREE from "three";
import { getHexColor, createJerseyTexture } from "../utils/textures";
import { playCheer, playGroan } from "../utils/audio";
import { StadiumData } from "../utils/models";

export interface PhysicsElements {
  updateSurroundings?: (delta: number, active: boolean) => void;
  updateEntrance?: (delta: number) => boolean;
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  ballGroup: THREE.Group;
  pGroup: THREE.Group;
  gkGroup: THREE.Group;
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
    const currentTarget = new THREE.Vector3();
    const nextPosition = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const dummy = new THREE.Object3D();
    let keeperType = propsRef.current.gkType;
    let lastCrowdUpdate = -Infinity;
    let resolved = false;
    let goalScored = false;
    const netRestZ = elements.net.position.z;
    const resolve = (outcome: import("../utils/penaltyPhysics").ShotOutcome) => {
      if (resolved) return;
      resolved = true;
      goalScored = outcome === "goal";
      propsRef.current.onShotResolved?.(outcome);
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      if (document.hidden) return;
      const time = clock.elapsedTime;
      const entering = elements.updateEntrance?.(delta) ?? false;
      elements.updateSurroundings?.(delta, entering);

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
        net,
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
        pNumberMat.map?.dispose();
        pNumberMat.map = createJerseyTexture(targetHex);
        pNumberMat.needsUpdate = true;
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

      // CẦU THỦ CHẠY ĐÀ VÀ RESET TỐC BIẾN
      if (phase === "shooting" || phase === "result") {
        if (pGroup.position.z > 2.5) {
          pGroup.position.z -= delta * 11;
          pGroup.position.x -= delta * 3.3;
          const runCycle = time * 15;
          kicker.legL.rotation.x = Math.sin(runCycle) * 0.8;
          kicker.legR.rotation.x = Math.sin(runCycle + Math.PI) * 0.8;
        } else {
          if (!state.ballStartKick) state.ballStartKick = true;
          kicker.legR.rotation.x = THREE.MathUtils.lerp(
            kicker.legR.rotation.x,
            -2,
            delta * 20
          );
          kicker.legL.rotation.x = 0;
        }
      } else {
        state.ballStartKick = false;
        state.hasBounced = false;
        resolved = false;
        goalScored = false;
        state.netBulgeTime = 0;

        ballGroup.position.set(0, 0.15, 2);
        ballGroup.rotation.set(0, 0, 0);
        state.reboundVel.set(0, 0, 0);

        pGroup.position.set(0.5, 0, 4.5);
        kicker.legL.rotation.x = 0;
        kicker.legR.rotation.x = 0;

        gkGroup.position.set(0, 0, -3.9);
      }

      // --- 2. THỦ MÔN BAY NGƯỜI (Áp dụng Speed Multiplier) ---
      if (state.ballStartKick) {
        const safeGkX = Math.max(-2.2, Math.min(2.2, gkTargetX ?? 0));
        const speedMulti = gkData.speedMultiplier; // Lấy hệ số tốc độ (Gấu chậm, chồn nhanh)

        // Cập nhật vị trí X của thủ môn
        gkGroup.position.x +=
          (safeGkX - gkGroup.position.x) * (1 - Math.exp(-delta * 7 * speedMulti));
      }
      animateGoalkeeper(gkData, time, delta, state.ballStartKick, gkGroup.position.x);

      // --- 3. VẬT LÝ BÓNG BAY & VA CHẠM VỚI THỦ MÔN ---
      if (state.ballStartKick) {
        // QUỸ ĐẠO BAY CỦA BÓNG
        if (!state.hasBounced) {
          currentTarget.set(...ballTarget);
          const dist = ballGroup.position.distanceTo(currentTarget);

          direction.subVectors(currentTarget, ballGroup.position).normalize();
          nextPosition.copy(ballGroup.position).addScaledVector(direction, Math.min(delta * 24, dist));
          collidesWithKeeper.prepare();
          if (collidesWithKeeper(ballGroup.position, nextPosition, BALL_RADIUS, true)) {
            // Locate first contact along the sweep so rebounds start at the keeper.
            let low = 0;
            let high = 1;
            for (let i = 0; i < 8; i++) {
              const middle = (low + high) / 2;
              currentTarget.lerpVectors(ballGroup.position, nextPosition, middle);
              if (collidesWithKeeper(ballGroup.position, currentTarget, BALL_RADIUS, true)) high = middle;
              else low = middle;
            }
            ballGroup.position.lerp(nextPosition, high);
            state.hasBounced = true;
            playGroan();
            state.reboundVel.set((Math.random() - 0.5) * 8, Math.random() * 5 + 2, Math.random() * 10 + 5);
            resolve("save");
          } else {
            ballGroup.position.copy(nextPosition);
            ballGroup.rotation.x -= delta * 40;
          }
          if (!state.hasBounced && ballGroup.position.distanceToSquared(currentTarget) < 0.0001) {
            state.hasBounced = true;
            const targetZ = ballTarget[2];
            const targetX = ballTarget[0];

            if (targetZ <= -6) {
              resolve("miss");
              playGroan();
              state.reboundVel.set(targetX > 0 ? 4 : -4, -1, -6);
            } else if (targetZ < -4.5) {
              resolve("goal");
              playCheer();
              state.reboundVel.set((Math.random() - 0.5) * 1.5, -4, 2);
              state.netBulgeTime = 0.2;
            } else if (targetZ > -4.2 && targetZ < -3.8) {
              resolve("post");
              playGroan();
              const bounceX = targetX > 0 ? -3 : 3;
              state.reboundVel.set(bounceX + (Math.random() - 0.5) * 3, 4, 8);
            }
          }
        } else {
          // BÓNG ĐANG RƠI (REBOUND) SAU KHI CHẠM LƯỚI / CỘT / THỦ MÔN
          ballGroup.position.addScaledVector(state.reboundVel, delta);
          state.reboundVel.y -= 18 * delta; // Trọng lực kéo xuống

          if (ballGroup.position.y < BALL_RADIUS) {
            ballGroup.position.y = BALL_RADIUS;
            state.reboundVel.y *= -0.55; // Nảy lên
            state.reboundVel.x *= 0.8; // Ma sát giảm tốc
            state.reboundVel.z *= 0.8;
          }
          ballGroup.rotation.x += state.reboundVel.z * delta * 2;
          ballGroup.rotation.z -= state.reboundVel.x * delta * 2;
        }
      }

      // HIỆU ỨNG LƯỚI
      if (state.netBulgeTime > 0) {
        state.netBulgeTime -= delta;
        const intensity = state.netBulgeTime * 5;
        net.position.z = netRestZ - intensity * 0.4;
        net.scale.z = 1 + intensity * 0.15;
      } else {
        net.position.z = netRestZ;
        net.scale.z = 1;
      }

      // Background crowd updates at 30 Hz; gameplay still renders every frame.
      if (time - lastCrowdUpdate >= 1 / 30) {
        lastCrowdUpdate = time;
        const { stadiumData } = elements;
        const {
          bodiesInstanced,
          headsInstanced,
          flagsInstanced,
          fanPositions,
          flagCount,
        } = stadiumData;

        const elapsedTime = time;

        const isGoalScored = phase === "result" && goalScored;
        const jumpSpeed = isGoalScored ? 12 : 5;
        const jumpHeight = isGoalScored ? 0.25 : 0.08;

        let flagIdx = 0;

        fanPositions.forEach((pos, i) => {
          const jumpOffset =
            Math.sin(elapsedTime * jumpSpeed + pos.phase) * jumpHeight;
          const currentY = Math.max(pos.y, pos.y + jumpOffset);

          // Body/head orientation is static: update only the translation in each matrix.
          bodiesInstanced.instanceMatrix.array[i * 16 + 13] = currentY + 0.05;
          headsInstanced.instanceMatrix.array[i * 16 + 13] = currentY + 0.55;

          if (i % 10 === 0 && flagIdx < flagCount) {
            const waveAngle = Math.sin(elapsedTime * 8 + pos.phase) * 0.5;
            dummy.position.set(pos.x + 0.4, currentY + 0.8, pos.z + 0.2);
            dummy.rotation.set(0, waveAngle, waveAngle * 0.5);
            dummy.updateMatrix();
            flagsInstanced.setMatrixAt(flagIdx, dummy.matrix);
            flagIdx++;
          }
        });

        bodiesInstanced.instanceMatrix.needsUpdate = true;
        headsInstanced.instanceMatrix.needsUpdate = true;
        flagsInstanced.instanceMatrix.needsUpdate = true;

      }

      renderer.render(scene, camera);
    };

    animate();

    return () => cancelAnimationFrame(animId);
  }, [propsRef]);

  return { startAnimation };
}
