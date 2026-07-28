import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Penalty3DProps {
  phase: "aiming" | "timing" | "power" | "shooting" | "result";
  aimValue: number;
  scaleValue?: number;
  ballTarget: [number, number, number];
  jerseyColor?: string;
  gkTargetX?: number; // Nhận vị trí thủ môn từ GameBoard3D
}

function getHexColor(tailwindClass?: string): number {
  switch (tailwindClass) {
    case "bg-red-600":
      return 0xdc2626;
    case "bg-blue-600":
      return 0x2563eb;
    case "bg-yellow-400":
      return 0xfacc15;
    case "bg-white":
      return 0xffffff;
    case "bg-green-500":
      return 0x22c55e;
    default:
      return 0xdc2626;
  }
}

function createJerseyTexture(hexColor: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const colorStr = "#" + hexColor.toString(16).padStart(6, "0");
  ctx.fillStyle = colorStr;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = hexColor === 0xffffff ? "#000000" : "#ffffff";
  ctx.font = "bold 140px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("10", 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function createFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffdbac";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(40, 50, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(88, 50, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(64, 75, 15, 0.2 * Math.PI, 0.8 * Math.PI, false);
  ctx.stroke();
  return new THREE.CanvasTexture(canvas);
}

function createNetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(255,255,255,0)";
  ctx.fillRect(0, 0, 512, 512);

  // Tăng độ dày sợi lưới để rõ ràng hơn
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 14;
  ctx.strokeRect(0, 0, 512, 512);

  // Kẻ đường chéo cho cấu trúc lưới chuẩn hơn
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(512, 512);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 8);
  return tex;
}

function createHumanoid(
  skinMat: THREE.Material,
  shirtMat: THREE.Material,
  shortsMat: THREE.Material,
  hairColor: number,
  faceTex: THREE.Texture,
  isKicker: boolean
) {
  const group = new THREE.Group();

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.25, 0);
  const headMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.5,
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), headMat);
  head.castShadow = true;
  head.rotation.y = isKicker ? Math.PI : 0;
  headGroup.add(head);

  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.9,
  });
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2),
    hairMat
  );
  hair.position.y = 0.02;
  hair.castShadow = true;
  headGroup.add(hair);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.2, 0.6, 16),
    shirtMat
  );
  body.position.set(0, 0.75, 0);
  body.castShadow = true;
  body.receiveShadow = true;

  const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.5, 16);
  const armL = new THREE.Mesh(armGeo, skinMat);
  armL.position.set(-0.3, 0.7, 0);
  armL.castShadow = true;
  const armR = new THREE.Mesh(armGeo, skinMat);
  armR.position.set(0.3, 0.7, 0);
  armR.castShadow = true;

  const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.45, 16);
  const legL = new THREE.Mesh(legGeo, shortsMat);
  legL.position.set(-0.12, 0.25, 0);
  legL.castShadow = true;
  const legR = new THREE.Mesh(legGeo, shortsMat);
  legR.position.set(0.12, 0.25, 0);
  legR.castShadow = true;

  group.add(headGroup, body, armL, armR, legL, legR);
  return { group, armL, armR, legL, legR, body };
}

export default function Penalty3D({
  phase,
  aimValue,
  scaleValue,
  ballTarget,
  jerseyColor = "bg-red-600",
  gkTargetX = 0,
}: Penalty3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const hasBounced = useRef(false);

  const propsRef = useRef({
    phase,
    aimValue,
    scaleValue,
    ballTarget,
    jerseyColor,
    gkTargetX,
  });

  useEffect(() => {
    propsRef.current = {
      phase,
      aimValue,
      scaleValue,
      ballTarget,
      jerseyColor,
      gkTargetX,
    };
  }, [phase, aimValue, scaleValue, ballTarget, jerseyColor, gkTargetX]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#87CEEB");

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 150);
    camera.position.set(0, 3.5, 9);
    camera.lookAt(0, 1.2, -4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // -----------------------------------------------------------------
    // 1. SÂN CỎ & VẠCH KẺ VÔI (ĐÃ SỬA LỖI HIỂN THỊ)
    // -----------------------------------------------------------------
    const pitchGroup = new THREE.Group();

    // Nền cỏ chính bao phủ toàn bộ không gian
    const mainGrassGeo = new THREE.PlaneGeometry(120, 120);
    const mainGrassMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.8,
    });
    const mainGrass = new THREE.Mesh(mainGrassGeo, mainGrassMat);
    mainGrass.rotation.x = -Math.PI / 2;
    mainGrass.position.set(0, 0, -5);
    mainGrass.receiveShadow = true;
    pitchGroup.add(mainGrass);

    // Kẻ các sọc cỏ xen kẽ
    for (let i = 0; i < 25; i++) {
      const stripeMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x2e7d32 : 0x388e3c,
        roughness: 0.8,
      });
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(70, 2), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.005, 18 - i * 2);
      stripe.receiveShadow = true;
      pitchGroup.add(stripe);
    }
    scene.add(pitchGroup);

    // -----------------------------------------------------------------
    // VẠCH KẺ KÍCH THƯỚC CHUẨN: 16M50, 5M50 VÀ CHẤM 11M
    // -----------------------------------------------------------------
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const linesGroup = new THREE.Group();
    linesGroup.position.y = 0.02; // Nâng nhẹ lên trên mặt cỏ để không bị đè nét

    // 1. Vạch gôn (Goal Line)
    const goalLine = new THREE.Mesh(new THREE.PlaneGeometry(30, 0.12), lineMat);
    goalLine.rotation.x = -Math.PI / 2;
    goalLine.position.set(0, 0, -4.04);
    linesGroup.add(goalLine);

    // 2. Khu vực 5m50 (Goal Area: Rộng 18.32m, Sâu 5.5m)
    const box5m50Front = new THREE.Mesh(
      new THREE.PlaneGeometry(10.32, 0.12),
      lineMat
    );
    box5m50Front.rotation.x = -Math.PI / 2;
    box5m50Front.position.set(0, 0, -0.1);

    const box5m50Left = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 4),
      lineMat
    );
    box5m50Left.rotation.x = -Math.PI / 2;
    box5m50Left.position.set(-5.16, 0, -2.1);

    const box5m50Right = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 4),
      lineMat
    );
    box5m50Right.rotation.x = -Math.PI / 2;
    box5m50Right.position.set(5.16, 0, -2.1);

    linesGroup.add(box5m50Front, box5m50Left, box5m50Right);

    // 3. Khu vực 16m50 (Penalty Area: Rộng 40.32m, Sâu 16.5m)
    const box16m50Front = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 0.12),
      lineMat
    );
    box16m50Front.rotation.x = -Math.PI / 2;
    box16m50Front.position.set(0, 0, 8.46);

    const box16m50Left = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 16.5),
      lineMat
    );
    box16m50Left.rotation.x = -Math.PI / 2;
    box16m50Left.position.set(-20.16, 0, 4.21);

    const box16m50Right = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 16.5),
      lineMat
    );
    box16m50Right.rotation.x = -Math.PI / 2;
    box16m50Right.position.set(20.16, 0, 4.21);

    linesGroup.add(box16m50Front, box16m50Left, box16m50Right);

    // 4. Chấm phạt đền (Penalty Spot) & Vòng cung 16m50
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), lineMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, 0, 2);
    linesGroup.add(spot);

    scene.add(linesGroup);

    // Mũi tên định hướng góc sút (Nhịp 1)
    const aimArrowGroup = new THREE.Group();
    aimArrowGroup.position.set(0, 0.05, 2);
    const arrowMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.6, 8),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    arrowMesh.rotation.x = -Math.PI / 2;
    arrowMesh.position.z = -0.8;
    aimArrowGroup.add(arrowMesh);
    scene.add(aimArrowGroup);

    // VÒNG CANH NHỊP SÚT 3D (NHỊP 2)
    // -----------------------------------------------------------------
    const timingRingGroup = new THREE.Group();
    timingRingGroup.position.set(0, 0.04, 2); // Cùng vị trí chấm penalty (z=2)

    // Viền vòng tròn
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const timingRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.42, 32),
      ringMat
    );
    timingRing.rotation.x = -Math.PI / 2;
    timingRingGroup.add(timingRing);

    // Nền mờ bên trong
    const innerCircleMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    const innerCircle = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 32),
      innerCircleMat
    );
    innerCircle.rotation.x = -Math.PI / 2;
    timingRingGroup.add(innerCircle);

    scene.add(timingRingGroup);

    // Khung thành
    const goalWidth = 7.32;
    const goalHeight = 2.44;
    const goalGroup = new THREE.Group();
    goalGroup.position.set(0, 0, -4.04);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
    });
    const postL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, goalHeight, 16),
      postMat
    );
    postL.position.set(-goalWidth / 2, goalHeight / 2, 0);
    postL.castShadow = true;
    const postR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, goalHeight, 16),
      postMat
    );
    postR.position.set(goalWidth / 2, goalHeight / 2, 0);
    postR.castShadow = true;
    const crossbar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, goalWidth + 0.16, 16),
      postMat
    );
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, goalHeight, 0);
    crossbar.castShadow = true;

    // Lưới rõ ràng hơn
    const net = new THREE.Mesh(
      new THREE.BoxGeometry(7.32, 2.44, 1.2),
      new THREE.MeshStandardMaterial({
        map: createNetTexture(),
        transparent: true,
        opacity: 1,
        emissive: 0x222222, // Sáng nhẹ
        side: THREE.DoubleSide,
      })
    );
    net.position.set(0, 1.22, -0.6);
    goalGroup.add(postL, postR, crossbar, net);
    scene.add(goalGroup);

    // Khán đài
    // -----------------------------------------------------------------
    // 4. KHÁN ĐÀI & KHÁN GIẢ (ĐÃ PHỤC HỒI ĐẦY ĐỦ)
    // -----------------------------------------------------------------
    const stadiumGroup = new THREE.Group();
    stadiumGroup.position.set(0, 0, -10);

    // Tạo 5 tầng khán đài
    for (let i = 0; i < 5; i++) {
      const stepY = i * 1.3;
      const stepZ = -i * 2.2;

      // Bậc thang
      const row = new THREE.Mesh(
        new THREE.BoxGeometry(60, stepY + 1.8, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      row.position.set(0, stepY / 2, stepZ);
      stadiumGroup.add(row);

      // Tạo khán giả dạng người đứng/ngồi trên mỗi bậc
      for (let j = -30; j <= 30; j += 1.1) {
        if (Math.random() > 0.05) {
          // 90% cơ hội xuất hiện khán giả
          const fanGroup = new THREE.Group();
          const isHomeFan = Math.random() > 0.3;
          const shirtColor = isHomeFan ? 0xef4444 : 0x3b82f6; // Áo đỏ hoặc xanh

          const fanBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.18, 0.7, 8),
            new THREE.MeshStandardMaterial({ color: shirtColor })
          );
          fanBody.position.y = 0.35;

          const fanHead = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffdbac })
          );
          fanHead.position.y = 0.85;

          fanGroup.add(fanBody, fanHead);
          fanGroup.position.set(
            j + (Math.random() - 0.5) * 0.3,
            stepY + 0.9,
            stepZ
          );
          stadiumGroup.add(fanGroup);
        }
      }
    }
    scene.add(stadiumGroup);

    // Bóng
    const ballGroup = new THREE.Group();
    ballGroup.position.set(0, 0.15, 2);
    const ballCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    const ballWire = new THREE.Mesh(
      new THREE.SphereGeometry(0.152, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: false })
    );
    ballCore.castShadow = true;
    ballGroup.add(ballCore, ballWire);
    scene.add(ballGroup);

    // Cầu thủ & Thủ môn
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffdbac,
      roughness: 0.6,
    });
    let currentJerseyHex = getHexColor(propsRef.current.jerseyColor);

    // Tách riêng material áo cầu thủ để có thể thay đổi động
    const pShirtMat = new THREE.MeshStandardMaterial({
      color: currentJerseyHex,
    });
    const pNumberMat = new THREE.MeshBasicMaterial({
      map: createJerseyTexture(currentJerseyHex),
      transparent: true,
    });

    const kicker = createHumanoid(
      skinMat,
      pShirtMat,
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
      0x3b2f2f,
      createFaceTexture(),
      true
    );
    const numberPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 0.35),
      pNumberMat
    );
    numberPlane.position.set(0, 0, 0.23);
    numberPlane.rotation.y = Math.PI;
    kicker.body.add(numberPlane);

    const pGroup = new THREE.Group();
    pGroup.position.set(1.5, 0, 4.5);
    kicker.group.rotation.y = -0.3;
    pGroup.add(kicker.group);
    scene.add(pGroup);

    const gk = createHumanoid(
      skinMat,
      new THREE.MeshStandardMaterial({ color: 0x10b981 }),
      new THREE.MeshStandardMaterial({ color: 0x000000 }),
      0x000000,
      createFaceTexture(),
      false
    );
    gk.armL.rotation.z = 0.5;
    gk.armR.rotation.z = -0.5;
    const gkGroup = new THREE.Group();
    gkGroup.position.set(0, 0, -3.9);
    gkGroup.add(gk.group);
    scene.add(gkGroup);

    // Loop
    let animId: number;
    const clock = new THREE.Clock();
    let ballStartKick = false;
    let reboundVel = new THREE.Vector3(); // Vector gia tốc nẩy bóng
    let netBulgeTime = 0; // Thời gian lưới rung

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();
      const { phase, aimValue, ballTarget, gkTargetX, jerseyColor } =
        propsRef.current;

      // Xử lý áo thay đổi màu
      const targetHex = getHexColor(jerseyColor);
      if (currentJerseyHex !== targetHex) {
        currentJerseyHex = targetHex;
        pShirtMat.color.setHex(targetHex);
        pNumberMat.map = createJerseyTexture(targetHex);
        pNumberMat.needsUpdate = true;
      }

      aimArrowGroup.visible = phase === "aiming";
      aimArrowGroup.rotation.y = (aimValue - 0.5) * -Math.PI * 0.8;

      // 2. NHỊP 2: Vòng canh nhịp (Co bóp và đổi màu)
      timingRingGroup.visible = propsRef.current.phase === "timing";

      if (propsRef.current.phase === "timing") {
        // LẤY TRỰC TIẾP TỪ propsRef để tránh Stale Closure
        // Dùng toán tử ?? thay vì || để đề phòng scaleValue = 0
        const currentScale = propsRef.current.scaleValue ?? 1;

        // Cập nhật thu phóng vòng tròn 3D
        timingRingGroup.scale.set(currentScale, currentScale, currentScale);

        // Đổi màu theo độ thu nhỏ (Scale ≈ 1 là xanh Perfect, To hơn là Vàng/Đỏ)
        let ringHexColor = 0xef4444; // Đỏ (Miss)

        if (currentScale <= 1.3 && currentScale >= 0.7) {
          ringHexColor = 0x22c55e; // Xanh lá (Perfect)
        } else if (currentScale <= 1.8) {
          ringHexColor = 0xfacc15; // Vàng (Good)
        }

        // Cập nhật màu cho viền và nền
        ringMat.color.setHex(ringHexColor);
        innerCircleMat.color.setHex(ringHexColor);
      }

      // CẦU THỦ CHẠY ĐÀ VÀ RESET TỐC BIẾN
      if (phase === "shooting" || phase === "result") {
        if (pGroup.position.z > 2.6) {
          pGroup.position.z -= delta * 11;
          pGroup.position.x -= delta * 3.3;
          const runCycle = time * 15;
          kicker.legL.rotation.x = Math.sin(runCycle) * 0.8;
          kicker.legR.rotation.x = Math.sin(runCycle + Math.PI) * 0.8;
        } else {
          if (!ballStartKick) ballStartKick = true;
          kicker.legR.rotation.x = THREE.MathUtils.lerp(
            kicker.legR.rotation.x,
            -1.2,
            delta * 25
          );
          kicker.legL.rotation.x = 0;
        }
      } else {
        // RESET NGAY LẬP TỨC (Dùng chung lúc GameBoard nhòe Blur)
        ballStartKick = false;
        hasBounced.current = false;
        ballGroup.position.set(0, 0.15, 2);
        ballGroup.rotation.set(0, 0, 0);
        reboundVel.set(0, 0, 0);

        pGroup.position.set(1.5, 0, 4.5);
        kicker.legL.rotation.x = 0;
        kicker.legR.rotation.x = 0;

        gkGroup.position.set(0, 0, -3.9);
        gk.group.rotation.z = 0;
        gk.group.position.y = 0;
      }

      // VẬT LÝ BÓNG BAY & NẨY BẬT
      if (ballStartKick) {
        if (!hasBounced.current) {
          const currentTarget = new THREE.Vector3(...ballTarget);
          const dist = ballGroup.position.distanceTo(currentTarget);

          if (dist > 0.3) {
            // ĐANG BAY (Xé gió tới điểm mục tiêu) - ĐÃ SỬA LỖI BẰNG TOÁN VECTOR
            const flySpeed = delta * 24;

            // Tính toán hướng bay (Direction) và cộng vào vị trí bóng
            const direction = new THREE.Vector3()
              .subVectors(currentTarget, ballGroup.position)
              .normalize();
            ballGroup.position.add(direction.multiplyScalar(flySpeed));

            ballGroup.rotation.x -= delta * 40;
          } else {
            // ĐÃ CHẠM VÀO ĐIỂM (Cột/Thủ Môn/Lưới/Ra ngoài)
            hasBounced.current = true;
            const targetZ = ballTarget[2];
            const targetX = ballTarget[0];

            if (targetZ <= -6) {
              // BAY RA NGOÀI: Giữ nguyên lực và quán tính rơi tự do
              reboundVel.set(targetX > 0 ? 4 : -4, -1, -6);
            } else if (targetZ < -4.5) {
              // VÀO LƯỚI: Bóng dội xuống đất, lăn nhẹ
              reboundVel.set((Math.random() - 0.5) * 1.5, -4, 2);
              netBulgeTime = 0.2; // Kích hoạt lưới tung
            } else if (targetZ > -4.2 && targetZ < -3.8) {
              // TRÚNG CỘT & THỦ MÔN: Nẩy bật văng ra lại sân
              const bounceX = targetX > 0 ? -3 : 3;
              reboundVel.set(bounceX + (Math.random() - 0.5) * 3, 4, 8);
            }
          }
        } else {
          // BÓNG RƠI BỞI TRỌNG LỰC SAU KHI NẨY
          ballGroup.position.addScaledVector(reboundVel, delta);
          reboundVel.y -= 18 * delta; // Trọng lực (Gravity)

          // Bóng nẩy trên mặt cỏ
          if (ballGroup.position.y < 0.15) {
            ballGroup.position.y = 0.15;
            reboundVel.y *= -0.55; // Độ đàn hồi cỏ
            reboundVel.x *= 0.8; // Ma sát
            reboundVel.z *= 0.8;
          }

          // Bóng xoay nhẹ khi lăn
          ballGroup.rotation.x += reboundVel.z * delta * 2;
          ballGroup.rotation.z -= reboundVel.x * delta * 2;
        }
      }

      // HIỆU ỨNG LƯỚI RUNG
      if (netBulgeTime > 0) {
        netBulgeTime -= delta;
        const intensity = netBulgeTime * 5; // Độ mạnh của lưới rung
        net.position.z = -0.6 - intensity * 0.4; // Đẩy lưới giật lùi
        net.scale.z = 1 + intensity * 0.15; // Giãn nở nhẹ sợi lưới
      } else {
        net.position.z = -0.6;
        net.scale.z = 1;
      }

      // THỦ MÔN BAY NGƯỜI (Giới hạn vùng an toàn không bay lọt khỏi cột dọc)
      if (ballStartKick) {
        const safeGkX = Math.max(-2.2, Math.min(2.2, gkTargetX)); // KHÔNG RA NGOÀI CỘT
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

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const newW = containerRef.current.clientWidth || 1200;
      const newH = containerRef.current.clientHeight || 650;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-[1200px] h-[600px] relative overflow-hidden rounded-xl shadow-2xl"
    />
  );
}
