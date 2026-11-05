import { useEffect, useState } from "react";
import { Check, MapPin } from "lucide-react";
import * as THREE from "three";
import { STADIUMS } from "../constants/stadiums";
import { useGameStore } from "../store/gameStore";
import { createStadiumMiniature } from "./stadium/createStadiumMiniature";
import { disposeScene } from "../utils/penaltyPhysics";

let cachedPreviews: Record<string, string> | null = null;

export default function StadiumPicker() {
  const stadiumId = useGameStore(state => state.stadiumId);
  const setStadium = useGameStore(state => state.setStadium);
  const [previews, setPreviews] = useState(cachedPreviews);

  useEffect(() => {
    if (cachedPreviews) return;
    let renderer: THREE.WebGLRenderer | undefined;
    try {
      // Render three stills with one temporary context. No idle thumbnail loops.
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(560, 360);
      renderer.setPixelRatio(1);
      const camera = new THREE.PerspectiveCamera(38, 560 / 360, 0.1, 500);
      camera.position.set(110, 105, 125);
      camera.lookAt(0, 2, 0);
      const images: Record<string, string> = {};
      for (const stadium of STADIUMS) {
        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xe0f1ff, 0x527060, 2.5));
        const sun = new THREE.DirectionalLight(0xffefdc, 3);
        sun.position.set(-40, 80, 50);
        scene.add(sun, createStadiumMiniature(stadium.id));
        renderer.render(scene, camera);
        images[stadium.id] = renderer.domElement.toDataURL("image/png");
        disposeScene(scene);
      }
      cachedPreviews = images;
      setPreviews(images);
    } catch {
      // Venue selection remains usable on devices without WebGL.
    } finally {
      renderer?.dispose();
      renderer?.forceContextLoss();
    }
  }, []);

  return (
    <div className="stadium-grid" aria-label="Choose a stadium">
      {STADIUMS.map(stadium => {
        const selected = stadiumId === stadium.id;
        return (
          <button type="button" key={stadium.id} aria-pressed={selected}
            onClick={() => setStadium(stadium.id)}
            className={`stadium-card ${selected ? "is-selected" : ""}`}
            style={{ "--venue-color": stadium.color } as React.CSSProperties}>
            <div className="stadium-preview">
              <span className="stadium-card-index">0{STADIUMS.indexOf(stadium) + 1}</span>
              {selected && <span className="stadium-selected"><Check size={13} /> Selected</span>}
              {previews?.[stadium.id]
                ? <img src={previews[stadium.id]} alt={`Simplified 3D model of ${stadium.name}`} />
                : <span className="stadium-preview-placeholder" aria-hidden="true">◈</span>}
            </div>
            <div className="stadium-card-copy">
              <h3>{stadium.name}</h3>
              <p className="stadium-city"><MapPin size={12} /> {stadium.city}</p>
              <p className="stadium-description">{stadium.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
