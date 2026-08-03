import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  getHexColor,
  createJerseyTexture,
  createFaceTexture,
  createNetTexture,
  createSideNetTexture,
} from "../utils/textures";
import {
  createHumanoid,
  createOptimizedPitch,
  createOptimizedStadium,
  createPitchLines,
} from "../utils/models";
import { usePenaltyPhysics } from "../hooks/usePenaltyPhysics";
import { Player } from "../store/gameStore";

export interface Penalty3DProps {
  phase: "aiming" | "timing" | "power" | "shooting" | "result";
  aimValue: number;
  scaleValue?: number;
  ballTarget: [number, number, number];
  jerseyColor?: string;
  players: Player[];
  gkTargetX?: number;
}

export default function Penalty3D({
  phase,
  aimValue,
  scaleValue,
  ballTarget,
  jerseyColor = "bg-red-600",
  players,
  gkTargetX = 0,
}: Penalty3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync Props xuống Hook
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

  const { startAnimation } = usePenaltyPhysics(propsRef);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Get dynamic container dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Perspective Camera aspect ratio calculation
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 150);
    camera.position.set(0, 3.5, 9);
    camera.lookAt(0, 1.2, -4);

    // 2. Renderer sizing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // High-DPI screen support
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#87CEEB");

    // Tối ưu hóa bóng đổ để tránh mỏi GPU TV
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024; // Giảm map size để tối ưu
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // 1. SÂN CỎ & KHÁN ĐÀI (Đã Tối Ưu Tối Đa Bằng InstancedMesh)
    scene.add(createOptimizedPitch());
    scene.add(createPitchLines());

    // 3. UI 3D (Mũi Tên & Vòng Canh Nhịp)
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

    const timingRingGroup = new THREE.Group();
    timingRingGroup.position.set(0, 0.04, 2);
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

    // 4. KHUNG THÀNH
    const goalGroup = new THREE.Group();
    goalGroup.position.set(0, 0, -4.04);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
    });
    const postL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.44, 16),
      postMat
    );
    postL.position.set(-3.66, 1.22, 0);
    postL.castShadow = true;
    const postR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.44, 16),
      postMat
    );
    postR.position.set(3.66, 1.22, 0);
    postR.castShadow = true;
    const crossbar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 7.48, 16),
      postMat
    );
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 2.44, 0);
    crossbar.castShadow = true;

    // --- HIGH-CONTRAST FULL NET ASSEMBLY (Back, Top, Left, Right) ---
    const netGroup = new THREE.Group();
    const netMat = new THREE.MeshStandardMaterial({
      map: createNetTexture(),
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      roughness: 0.1,
    });

    const sideNetMat = new THREE.MeshStandardMaterial({
      map: createSideNetTexture(), // Properly scaled texture for side/top panels
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      roughness: 0.1,
    });

    const depth = 1.5;
    const gwidth = 7.32;
    const gheight = 2.44;

    // Back Net
    const backNet = new THREE.Mesh(
      new THREE.PlaneGeometry(gwidth, gheight),
      netMat
    );
    backNet.position.set(0, gheight / 2 - 0.1, -depth);

    // Top / Roof Net
    const topNet = new THREE.Mesh(
      new THREE.PlaneGeometry(gwidth, depth),
      sideNetMat
    );
    topNet.rotation.x = Math.PI / 2;
    topNet.position.set(0, gheight, -depth / 2);

    // Left Side Net
    const leftNet = new THREE.Mesh(
      new THREE.PlaneGeometry(depth, gheight),
      sideNetMat
    );
    leftNet.rotation.y = Math.PI / 2;
    leftNet.position.set(-gwidth / 2, gheight / 2, -depth / 3);

    // Right Side Net
    const rightNet = new THREE.Mesh(
      new THREE.PlaneGeometry(depth, gheight),
      sideNetMat
    );
    rightNet.rotation.y = Math.PI / 2;
    rightNet.position.set(gwidth / 2, gheight / 2, -depth / 3);

    netGroup.add(backNet, topNet, leftNet, rightNet);
    goalGroup.add(postL, postR, crossbar, netGroup);
    scene.add(goalGroup);

    // 5. QUẢ BÓNG
    // Khởi tạo TextureLoader
    const textureLoader = new THREE.TextureLoader();
    const ballTexture = textureLoader.load("/assets/ball2.jpg");

    // Tạo vật liệu với texture
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTexture,
      roughness: 0.4, // Bóng hơi nhám nhẹ giống da thật
      metalness: 0.1,
    });

    const ballCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 32, 32),
      ballMat
    );
    ballCore.castShadow = true;

    const ballGroup = new THREE.Group();
    ballGroup.position.set(0, 0.15, 2);
    ballGroup.add(ballCore); // Bỏ ballWire đi

    scene.add(ballGroup);

    // 6. CẦU THỦ VÀ THỦ MÔN
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffdbac,
      roughness: 0.6,
    });
    let currentJerseyHex = getHexColor(propsRef.current.jerseyColor);
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
      true,
      "95"
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
      false,
      "1"
    );
    gk.armL.rotation.z = 0.5;
    gk.armR.rotation.z = -0.5;
    const gkGroup = new THREE.Group();
    gkGroup.position.set(0, 0, -3.9);
    gkGroup.add(gk.group);
    scene.add(gkGroup);

    const stadiumData = createOptimizedStadium(
      getHexColor(players[0].jerseyColor).toString(),
      getHexColor(players[1].jerseyColor).toString()
    );
    scene.add(stadiumData.stadiumGroup);

    // START HOOK VẬT LÝ
    const cleanupAnimation = startAnimation({
      scene,
      camera,
      renderer,
      ballGroup,
      pGroup,
      gkGroup,
      aimArrowGroup,
      timingRingGroup,
      net: netGroup,
      kicker,
      gk,
      pShirtMat,
      pNumberMat,
      ringMat,
      innerCircleMat,
      stadiumData,
    });

    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      // Update Camera aspect ratio & projection matrix
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      // Update Renderer resolution
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cleanupAnimation();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-[1350px] h-[60vh] min-h-[500px] relative overflow-hidden shadow-2xl"
    />
  );
}
