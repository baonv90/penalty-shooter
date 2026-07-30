import { useRef } from "react";
import * as THREE from "three";
import { getHexColor, createJerseyTexture } from "../utils/textures";
import { playKick, playCheer, playGroan } from "../utils/audio";
import { StadiumData } from "../utils/models";

export interface PhysicsElements {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  ballGroup: THREE.Group;
  pGroup: THREE.Group;
  gkGroup: THREE.Group;
  aimArrowGroup: THREE.Group;
  timingRingGroup: THREE.Group;
  net: THREE.Mesh;
  kicker: any;
  gk: any;
  pShirtMat: THREE.MeshStandardMaterial;
  pNumberMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  innerCircleMat: THREE.MeshBasicMaterial;
  stadiumData: StadiumData;
}

export function usePenaltyPhysics(propsRef: React.MutableRefObject<any>) {
  const stateRef = useRef({
    hasBounced: false,
    ballStartKick: false,
    reboundVel: new THREE.Vector3(),
    netBulgeTime: 0,
    currentJerseyHex: 0,
  });

  const startAnimation = (elements: PhysicsElements) => {
    let animId: number;
    const clock = new THREE.Clock();
    const state = stateRef.current;

    // Khởi tạo màu áo gốc
    state.currentJerseyHex = getHexColor(propsRef.current.jerseyColor);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      const {
        phase,
        aimValue,
        scaleValue,
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
        gk,
        pShirtMat,
        pNumberMat,
        ringMat,
        innerCircleMat,
      } = elements;

      // Xử lý áo thay đổi màu
      const targetHex = getHexColor(jerseyColor);
      if (state.currentJerseyHex !== targetHex) {
        state.currentJerseyHex = targetHex;
        pShirtMat.color.setHex(targetHex);
        pNumberMat.map = createJerseyTexture(targetHex);
        pNumberMat.needsUpdate = true;
      }

      // NHỊP 1: Định hướng
      aimArrowGroup.visible = phase === "aiming";
      aimArrowGroup.rotation.y = (aimValue - 0.5) * -Math.PI * 0.8;

      // NHỊP 2: Vòng canh nhịp 3D
      timingRingGroup.visible = phase === "timing";
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
        ballGroup.position.set(0, 0.15, 2);
        ballGroup.rotation.set(0, 0, 0);
        state.reboundVel.set(0, 0, 0);

        pGroup.position.set(0.5, 0, 4.5);
        kicker.legL.rotation.x = 0;
        kicker.legR.rotation.x = 0;

        gkGroup.position.set(0, 0, -3.9);
        gk.group.rotation.z = 0;
        gk.group.position.y = 0;
      }

      // VẬT LÝ BÓNG BAY
      if (state.ballStartKick) {
        if (!state.hasBounced) {
          const currentTarget = new THREE.Vector3(...ballTarget);
          const dist = ballGroup.position.distanceTo(currentTarget);

          if (dist > 0.3) {
            const flySpeed = delta * 24;
            const direction = new THREE.Vector3()
              .subVectors(currentTarget, ballGroup.position)
              .normalize();
            ballGroup.position.add(direction.multiplyScalar(flySpeed));
            ballGroup.rotation.x -= delta * 40;
          } else {
            state.hasBounced = true;
            const targetZ = ballTarget[2];
            const targetX = ballTarget[0];

            if (targetZ <= -6) {
              playGroan();
              state.reboundVel.set(targetX > 0 ? 4 : -4, -1, -6);
            } else if (targetZ < -4.5) {
              playCheer();
              state.reboundVel.set((Math.random() - 0.5) * 1.5, -4, 2);
              state.netBulgeTime = 0.2;
            } else if (targetZ > -4.2 && targetZ < -3.8) {
              playGroan();
              const bounceX = targetX > 0 ? -3 : 3;
              state.reboundVel.set(bounceX + (Math.random() - 0.5) * 3, 4, 8);
            }
          }
        } else {
          ballGroup.position.addScaledVector(state.reboundVel, delta);
          state.reboundVel.y -= 18 * delta;

          if (ballGroup.position.y < 0.15) {
            ballGroup.position.y = 0.15;
            state.reboundVel.y *= -0.55;
            state.reboundVel.x *= 0.8;
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
        net.position.z = -0.6 - intensity * 0.4;
        net.scale.z = 1 + intensity * 0.15;
      } else {
        net.position.z = -0.6;
        net.scale.z = 1;
      }

      // THỦ MÔN BAY NGƯỜI
      if (state.ballStartKick) {
        const safeGkX = Math.max(-2.2, Math.min(2.2, gkTargetX));
        gkGroup.position.x +=
          (safeGkX - gkGroup.position.x) * Math.min(delta * 7, 1);
        const dist = Math.abs(gkGroup.position.x);
        if (dist > 0.3) {
          const leanDir = gkGroup.position.x > 0 ? -1 : 1;
          gk.group.rotation.z = leanDir * Math.min(dist * 0.8, 1.4);
          gk.group.position.y = Math.sin(Math.min(dist * 0.5, Math.PI)) * 0.8;
          gk.armL.rotation.z = 2.5;
          gk.armR.rotation.z = -2.5;
        }
      }
      const { stadiumData } = elements;
      const {
        bodiesInstanced,
        headsInstanced,
        flagsInstanced,
        fanPositions,
        flagCount,
      } = stadiumData;

      const dummy = new THREE.Object3D();
      const elapsedTime = clock.getElapsedTime();

      // Check if a goal was scored to make fans jump higher & faster
      const isGoalScored = phase === "result";
      const jumpSpeed = isGoalScored ? 12 : 5;
      const jumpHeight = isGoalScored ? 0.25 : 0.08;

      let flagIdx = 0;

      fanPositions.forEach((pos, i) => {
        // Calculate vertical bounce using Sine wave
        const jumpOffset =
          Math.sin(elapsedTime * jumpSpeed + pos.phase) * jumpHeight;
        const currentY = Math.max(pos.y, pos.y + jumpOffset);

        // Update Body position
        dummy.position.set(pos.x, currentY + 0.05, pos.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bodiesInstanced.setMatrixAt(i, dummy.matrix);

        // Update Head position
        dummy.position.set(pos.x, currentY + 0.55, pos.z);
        dummy.updateMatrix();
        headsInstanced.setMatrixAt(i, dummy.matrix);

        // Update Flags for every ~15th supporter
        if (i % 15 === 0 && flagIdx < flagCount) {
          const waveAngle = Math.sin(elapsedTime * 8 + pos.phase) * 0.5; // Waving motion
          dummy.position.set(pos.x + 0.4, currentY + 0.8, pos.z + 0.2); // Position flag in hand
          dummy.rotation.set(0, waveAngle, waveAngle * 0.5); // Wave back & forth
          dummy.updateMatrix();
          flagsInstanced.setMatrixAt(flagIdx, dummy.matrix);
          flagIdx++;
        }
      });

      // Flag Three.js matrices for rendering update
      bodiesInstanced.instanceMatrix.needsUpdate = true;
      headsInstanced.instanceMatrix.needsUpdate = true;
      flagsInstanced.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Trả về hàm dọn dẹp
    return () => cancelAnimationFrame(animId);
  };

  return { startAnimation };
}
