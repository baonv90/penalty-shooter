import { useRef } from "react";
import * as THREE from "three";
import { getHexColor, createJerseyTexture } from "../utils/textures";
import { playCheer, playGroan } from "../utils/audio";
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
  gkData: any; // <-- Dữ liệu thủ môn chứa group, speedMultiplier, armL, armR
  smokeGroup?: THREE.Group; // <-- Group khói cho Chồn hôi
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

    // --- KHAI BÁO CÁC BIẾN VA CHẠM VẬT LÝ ---
    const gkBox = new THREE.Box3(); // Khối hộp bao quanh toàn bộ thể tích thủ môn[cite: 4]
    const ballSphere = new THREE.Sphere(new THREE.Vector3(), 0.15); // Bán kính bóng 0.15m[cite: 4]
    let hasCollided = false; // Cờ đánh dấu bóng đã chạm thủ môn[cite: 4]

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
        gkData,
        smokeGroup,
        pShirtMat,
        pNumberMat,
        ringMat,
        innerCircleMat,
      } = elements;

      // --- 1. HIỆU ỨNG KHÓI CHO CHỒN (SKUNK) ---
      if (smokeGroup) {
        smokeGroup.rotation.z += delta * 0.5; // Xoay vòng từ từ
        smokeGroup.children.forEach((child, idx) => {
          // Phình to thu nhỏ liên tục tạo cảm giác mờ ảo
          const s = 1 + Math.sin(time * 3 + idx) * 0.25;
          child.scale.set(s, s, s);
        });
      }

      // Xử lý áo thay đổi màu[cite: 4]
      const targetHex = getHexColor(jerseyColor);
      if (state.currentJerseyHex !== targetHex) {
        state.currentJerseyHex = targetHex;
        pShirtMat.color.setHex(targetHex);
        pNumberMat.map = createJerseyTexture(targetHex);
        pNumberMat.needsUpdate = true;
      }

      // NHỊP 1: Định hướng[cite: 4]
      aimArrowGroup.visible = phase === "aiming";
      aimArrowGroup.rotation.y = (aimValue - 0.5) * -Math.PI * 0.8;

      // NHỊP 2: Vòng canh nhịp 3D[cite: 4]
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

      // CẦU THỦ CHẠY ĐÀ VÀ RESET TỐC BIẾN[cite: 4]
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
        hasCollided = false; // Reset cờ va chạm

        ballGroup.position.set(0, 0.15, 2);
        ballGroup.rotation.set(0, 0, 0);
        state.reboundVel.set(0, 0, 0);

        pGroup.position.set(0.5, 0, 4.5);
        kicker.legL.rotation.x = 0;
        kicker.legR.rotation.x = 0;

        // Đã sửa gk.group thành gkData.group
        gkGroup.position.set(0, 0, -3.9);
        if (gkData && gkData.group) {
          gkData.group.rotation.z = 0;
          gkData.group.position.y = 0;
        }
      }

      // --- 2. THỦ MÔN BAY NGƯỜI (Áp dụng Speed Multiplier) ---
      if (state.ballStartKick) {
        const safeGkX = Math.max(-2.2, Math.min(2.2, gkTargetX));
        const speedMulti = gkData?.speedMultiplier || 1; // Lấy hệ số tốc độ (Gấu chậm, chồn nhanh)

        // Cập nhật vị trí X của thủ môn
        gkGroup.position.x +=
          (safeGkX - gkGroup.position.x) * Math.min(delta * 7 * speedMulti, 1);

        const dist = Math.abs(gkGroup.position.x);
        if (dist > 0.3 && gkData && gkData.group) {
          const leanDir = gkGroup.position.x > 0 ? -1 : 1;
          gkData.group.rotation.z = leanDir * Math.min(dist * 0.8, 1.4);
          gkData.group.position.y =
            Math.sin(Math.min(dist * 0.5, Math.PI)) * 0.8;

          if (gkData.armL) gkData.armL.rotation.z = 2.5;
          if (gkData.armR) gkData.armR.rotation.z = -2.5;
        }
      }

      // --- 3. VẬT LÝ BÓNG BAY & VA CHẠM VỚI THỦ MÔN ---
      if (state.ballStartKick) {
        // KIỂM TRA VA CHẠM THỜI GIAN THỰC
        if (!hasCollided) {
          // Lấy bounding box bao trọn kích thước hiện tại của thủ môn (kể cả khi Gấu bị scale x1.5)
          gkBox.setFromObject(gkGroup);
          // Lấy vị trí hiện tại của bóng
          ballSphere.center.copy(ballGroup.position);

          // Nếu bóng chạm vào cơ thể thủ môn
          if (gkBox.intersectsSphere(ballSphere)) {
            hasCollided = true;
            state.hasBounced = true; // Hủy quỹ đạo bay thẳng vào khung thành
            playGroan(); // Phát tiếng ồ tiếc nuối

            // Bóng bật ra ngoài ngẫu nhiên
            state.reboundVel.set(
              (Math.random() - 0.5) * 8, // Bật trái/phải
              Math.random() * 5 + 2, // Bật lên trời
              Math.random() * 10 + 5 // Bật ngược lại về phía sân
            );
          }
        }

        // QUỸ ĐẠO BAY CỦA BÓNG
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
          // BÓNG ĐANG RƠI (REBOUND) SAU KHI CHẠM LƯỚI / CỘT / THỦ MÔN
          ballGroup.position.addScaledVector(state.reboundVel, delta);
          state.reboundVel.y -= 18 * delta; // Trọng lực kéo xuống

          if (ballGroup.position.y < 0.15) {
            ballGroup.position.y = 0.15;
            state.reboundVel.y *= -0.55; // Nảy lên
            state.reboundVel.x *= 0.8; // Ma sát giảm tốc
            state.reboundVel.z *= 0.8;
          }
          ballGroup.rotation.x += state.reboundVel.z * delta * 2;
          ballGroup.rotation.z -= state.reboundVel.x * delta * 2;
        }
      }

      // HIỆU ỨNG LƯỚI[cite: 4]
      if (state.netBulgeTime > 0) {
        state.netBulgeTime -= delta;
        const intensity = state.netBulgeTime * 5;
        net.position.z = -0.6 - intensity * 0.4;
        net.scale.z = 1 + intensity * 0.15;
      } else {
        net.position.z = -0.6;
        net.scale.z = 1;
      }

      // HIỆU ỨNG KHÁN GIẢ[cite: 4]
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

      const isGoalScored = phase === "result";
      const jumpSpeed = isGoalScored ? 12 : 5;
      const jumpHeight = isGoalScored ? 0.25 : 0.08;

      let flagIdx = 0;

      fanPositions.forEach((pos, i) => {
        const jumpOffset =
          Math.sin(elapsedTime * jumpSpeed + pos.phase) * jumpHeight;
        const currentY = Math.max(pos.y, pos.y + jumpOffset);

        dummy.position.set(pos.x, currentY + 0.05, pos.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bodiesInstanced.setMatrixAt(i, dummy.matrix);

        dummy.position.set(pos.x, currentY + 0.55, pos.z);
        dummy.updateMatrix();
        headsInstanced.setMatrixAt(i, dummy.matrix);

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

      renderer.render(scene, camera);
    };

    animate();

    return () => cancelAnimationFrame(animId);
  };

  return { startAnimation };
}
