import * as THREE from "three";
import { createFaceTexture } from "./textures";
import { createHumanoid } from "./models"; // Import hàm cũ của bạn
import { GKType } from "../store/gameStore";

export interface GKData {
  group: THREE.Group;
  scale: number;
  speedMultiplier: number;
  armL?: THREE.Mesh;
  armR?: THREE.Mesh;
}

export function createGoalkeeper(type: GKType): GKData {
  switch (type) {
    case "bear":
      return createBearGK();
    case "skunk":
      return createSkunkGK();
    case "human":
    default:
      return createHumanGK();
  }
}

function createBearGK(): GKData {
  const group = new THREE.Group();

  // Màu lông nâu ấm và màu mõm/bụng nhạt hơn
  const furMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b,
    roughness: 0.9,
  });
  const lightFurMat = new THREE.MeshStandardMaterial({
    color: 0xd2b48c,
    roughness: 0.9,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.5,
  });

  // 1. THÂN HÌNH (Bụng bự)
  // Sử dụng CapsuleGeometry cho thân hình mập mạp, bo tròn
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 0.5, 18, 18),
    furMat
  );
  body.position.set(0, 0.8, 0);
  body.castShadow = true;

  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 20, 20),
    lightFurMat
  );
  belly.position.set(0, 0.75, 0.2); // Bụng nhô ra phía trước

  // 2. ĐẦU VÀ MẶT
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.55, 0);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), furMat);

  // Tai gấu (hai nửa hình cầu dẹt)
  const earGeo = new THREE.SphereGeometry(0.1, 16, 16);
  const earL = new THREE.Mesh(earGeo, furMat);
  earL.position.set(-0.25, 0.2, 0);
  const earR = new THREE.Mesh(earGeo, furMat);
  earR.position.set(0.25, 0.2, 0);

  // Mõm nhô ra
  const snout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.15, 0.15, 16),
    lightFurMat
  );
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.05, 0.28);

  // Mũi đen nhỏ
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), blackMat);
  nose.position.set(0, 0.02, 0.35);

  headGroup.add(head, earL, earR, snout, nose);

  // 3. TAY & CHÂN (Mập mạp, ngắn)
  const limbGeo = new THREE.CapsuleGeometry(0.12, 0.3, 16, 16);

  const armL = new THREE.Mesh(limbGeo, furMat);
  armL.position.set(-0.5, 1.0, 0);
  armL.rotation.z = Math.PI / 8; // Dang tay nhẹ

  const armR = new THREE.Mesh(limbGeo, furMat);
  armR.position.set(0.5, 1.0, 0);
  armR.rotation.z = -Math.PI / 8;

  const legL = new THREE.Mesh(limbGeo, furMat);
  legL.position.set(-0.2, 0.3, 0);

  const legR = new THREE.Mesh(limbGeo, furMat);
  legR.position.set(0.2, 0.3, 0);

  group.add(body, belly, headGroup, armL, armR, legL, legR);

  return {
    group,
    scale: 1.6, // Giữ tỷ lệ to lớn hơn người
    speedMultiplier: 0.6, // Di chuyển chậm
    armL, // Trả về tay để có thể animate nhịp nhàng
    armR,
  };
}

// utils/goalkeepers.ts (Cập nhật phần Skunk)

function createSkunkGK(): GKData {
  const group = new THREE.Group();

  const blackFur = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.9,
  });
  const whiteFur = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
  });
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0xff69b4,
    roughness: 0.5,
  }); // Mũi hồng đáng yêu

  // 1. THÂN HÌNH (Nhỏ nhắn, hình hạt đậu/viên nang)
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.2, 0.3, 16, 16),
    blackFur
  );
  body.position.set(0, 0.5, 0);
  body.castShadow = true;

  // Vệt trắng trên lưng
  const bodyStripe = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.06, 0.32, 8, 8),
    whiteFur
  );
  bodyStripe.position.set(0, 0.52, -0.15); // Nằm ở mặt lưng sau

  // 2. ĐẦU VÀ MẶT
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.9, 0.05);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), blackFur);

  // Vệt trắng trên đỉnh đầu
  const headStripe = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 16),
    whiteFur
  );
  headStripe.position.set(0, 0.12, 0.08);

  // Mõm nhọn (ConeGeometry)
  const snout = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.15, 16),
    blackFur
  );
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.02, 0.2);

  // Mũi hồng ở chóp mõm
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), noseMat);
  nose.position.set(0, -0.02, 0.28);

  headGroup.add(head, headStripe, snout, nose);

  // 3. ĐUÔI (Rất to, cong lên làm điểm nhấn)
  const tail = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.15, 0.4, 16, 16),
    blackFur
  );
  tail.position.set(0, 0.4, -0.35);
  tail.rotation.x = -Math.PI / 6; // Đuôi vểnh lên

  // Vệt trắng dài dọc đuôi
  const tailStripe = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.05, 0.42, 8, 8),
    whiteFur
  );
  tailStripe.position.set(0, 0.42, -0.4);
  tailStripe.rotation.x = -Math.PI / 6;

  // 4. TAY & CHÂN (Nhỏ, lanh lẹ)
  const limbGeo = new THREE.CapsuleGeometry(0.05, 0.2, 16, 16);

  const armL = new THREE.Mesh(limbGeo, blackFur);
  armL.position.set(-0.25, 0.6, 0);
  armL.rotation.z = Math.PI / 4;

  const armR = new THREE.Mesh(limbGeo, blackFur);
  armR.position.set(0.25, 0.6, 0);
  armR.rotation.z = -Math.PI / 4;

  const legL = new THREE.Mesh(limbGeo, blackFur);
  legL.position.set(-0.1, 0.2, 0);

  const legR = new THREE.Mesh(limbGeo, blackFur);
  legR.position.set(0.1, 0.2, 0);

  group.add(
    body,
    bodyStripe,
    headGroup,
    tail,
    tailStripe,
    armL,
    armR,
    legL,
    legR
  );

  return {
    group,
    scale: 0.9, // Cơ thể nhỏ
    speedMultiplier: 1.8, // Di chuyển nhanh nhạy
    armL,
    armR,
  };
}

// utils/goalkeepers.ts (Cập nhật phần Human)

function createHumanGK(): GKData {
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffdbac,
    roughness: 0.6,
  });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

  // Gọi hàm tạo người hiện tại
  const human = createHumanoid(
    skinMat,
    shirtMat,
    shortsMat,
    0x000000,
    createFaceTexture(),
    false
  );

  // Làm cho tỷ lệ thân thiện với trẻ em (Đầu to hơn 1 chút - Chibi style)
  // Giả sử human.group.children[0] là headGroup trong createHumanoid của bạn
  const headGroup = human.group.children[0];
  if (headGroup) {
    headGroup.scale.set(1.3, 1.3, 1.3); // Phóng to đầu x1.3
  }

  return {
    group: human.group,
    scale: 1,
    speedMultiplier: 1,
    armL: human.armL,
    armR: human.armR,
  };
}
