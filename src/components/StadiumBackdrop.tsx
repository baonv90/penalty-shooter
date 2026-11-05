import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { StadiumId, getStadium } from "../constants/stadiums";
import { createStadiumSurroundings } from "./stadium/createStadiumSurroundings";
import { createStadiumActivity } from "./stadium/createStadiumActivity";
import { createStadiumDrive } from "./stadium/createStadiumDrive";
import { createOptimizedPitch, createOptimizedStadium, createPitchLines } from "../utils/models";
import { disposeScene } from "../utils/penaltyPhysics";
import { createStadiumAmbience } from "../utils/stadiumAmbience";

export default function StadiumBackdrop({ stadiumId, muted }: { stadiumId: StadiumId; muted: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ambienceRef = useRef<ReturnType<typeof createStadiumAmbience>>();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => { ambienceRef.current?.update(0.3); }, [muted]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const stadium = getStadium(stadiumId);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      setUnavailable(true);
      return;
    }
    setUnavailable(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(stadium.sky);
    scene.fog = new THREE.Fog(stadium.sky, 230, 580);
    scene.add(new THREE.HemisphereLight(0xe4f3ff, 0x718366, 2));
    const sun = new THREE.DirectionalLight(0xffe4bf, 2.5);
    sun.position.set(-70, 100, 40);
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 850);
    const crowd = createOptimizedStadium(stadium.seatColor, stadium.awaySeatColor, stadium.seatColor, stadiumId);
    const activity = createStadiumActivity(stadium.seatColor, stadium.awaySeatColor, stadiumId);
    scene.add(createOptimizedPitch(), createPitchLines(), crowd.stadiumGroup,
      createStadiumSurroundings(stadium.seatColor, stadium.awaySeatColor, stadiumId), activity.group);
    const drive = createStadiumDrive(camera, stadiumId);
    const ambience = createStadiumAmbience();
    ambienceRef.current = ambience;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let elapsed = 4;
    let previous: number | undefined;
    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      // Keep the whole venue in view on narrow portrait screens.
      camera.fov = width < height ? 72 : 56;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (motion.matches) renderer.render(scene, camera);
    };
    const render = (time: number) => {
      const delta = previous === undefined ? 0 : Math.min((time - previous) / 1000, 0.05);
      previous = time;
      if (!motion.matches) elapsed += delta;
      drive(elapsed);
      activity.update(motion.matches ? 0 : delta, true);
      crowd.updateCrowd?.(motion.matches ? 0 : elapsed, false);
      ambience.update(0.3);
      renderer.render(scene, camera);
      if (!motion.matches && !document.hidden) frame = requestAnimationFrame(render);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      previous = undefined;
      ambience.setSuspended(document.hidden);
      if (!document.hidden) frame = requestAnimationFrame(render);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    resume();
    document.addEventListener("visibilitychange", resume);
    motion.addEventListener("change", resume);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
      motion.removeEventListener("change", resume);
      ambience.stop();
      ambienceRef.current = undefined;
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [stadiumId]);

  return <div ref={containerRef} className="stadium-backdrop" aria-hidden="true">
    {unavailable && <div className="stadium-backdrop-fallback" />}
  </div>;
}
