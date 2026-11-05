import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, MapPin, Play, Settings2, Volume2, VolumeX, X } from "lucide-react";
import { getStadium } from "../constants/stadiums";
import { useGameStore } from "../store/gameStore";
import { initAudio } from "../utils/audio";
import Settings from "./Settings";
import StadiumBackdrop from "./StadiumBackdrop";
import StadiumPicker from "./StadiumPicker";

function StadiumIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <ellipse cx="12" cy="9" rx="9" ry="4" /><path d="M3 9v7c0 2.2 4 4 9 4s9-1.8 9-4V9M7 12v6m5-5v7m5-8v6M6 6V3m12 3V3M9 5V2m6 3V2" />
  </svg>;
}

export default function HomeScreen({ muted, onToggleMute }: { muted: boolean; onToggleMute: () => void }) {
  const [panel, setPanel] = useState<"home" | "settings" | "stadiums">("home");
  const stadiumId = useGameStore(state => state.stadiumId);
  const startGame = useGameStore(state => state.startGame);
  const stadium = getStadium(stadiumId);
  const dialogRef = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panel === "home") return;
    const launcher = document.activeElement as HTMLElement | null;
    // Keep keyboard and assistive-technology focus inside the open panel.
    homeRef.current?.setAttribute("inert", "");
    const focusFrame = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel("home");
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button, input, select, [tabindex='0']");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", keydown);
      homeRef.current?.removeAttribute("inert");
      launcher?.focus();
    };
  }, [panel]);

  const quickPlay = () => {
    initAudio();
    useGameStore.getState().updateSettings("medium", "standard", "button");
    useGameStore.getState().setGraphicsMode("3d");
    startGame();
  };

  return (
    <div className="home-screen" onPointerDown={initAudio} onKeyDown={initAudio} style={{ "--venue-color": stadium.color } as React.CSSProperties}>
      <StadiumBackdrop stadiumId={stadiumId} muted={muted} />
      <div className="home-vignette" />
      <div className="home-content" ref={homeRef} aria-hidden={panel !== "home" ? true : undefined}>
        <section className="home-hero" aria-labelledby="home-title">
          <p className="home-eyebrow"><span /> TWO PLAYERS. ONE MOMENT. <span /></p>
          <h1 id="home-title">PENALTY<span>SHOOTOUT<span className="home-title-dot">.</span></span></h1>
          <p className="home-tagline">The crowd is waiting. Make your moment.</p>
          <div className="home-actions">
            <button type="button" className="home-play" onClick={quickPlay}><Play size={19} fill="currentColor" /><span>Play</span><ChevronRight size={20} /></button>
            <button type="button" className="home-settings" onClick={() => setPanel("settings")}><Settings2 size={18} /><span>Settings</span></button>
          </div>
          <p className="home-play-caption">DEFAULT RULES <span>·</span> LOCAL 2 PLAYER</p>
        </section>
        <footer className="home-footer">
          <div className="home-tools">
            <button type="button" className="home-icon-button" onClick={onToggleMute} aria-label={muted ? "Unmute audio" : "Mute audio"} aria-pressed={muted} title={muted ? "Unmute audio" : "Mute audio"}>{muted ? <VolumeX size={21} /> : <Volume2 size={21} />}</button>
            <span className="home-tool-divider" />
            <button type="button" className="home-icon-button home-stadium-button" onClick={() => setPanel("stadiums")} aria-label="Change stadium" title="Change stadium"><StadiumIcon /><span>Change stadium</span><ArrowUpRight size={15} /></button>
          </div>
          <div className="home-location"><MapPin size={16} /><div><span className="home-location-caption">TONIGHT'S GROUND</span><span className="home-location-name">{stadium.name}<span>{stadium.city}</span></span></div></div>
        </footer>
      </div>
      {panel !== "home" && (
        <div className="home-modal-backdrop" onClick={event => { if (event.target === event.currentTarget) setPanel("home"); }}>
          <div className={`home-panel ${panel === "settings" ? "home-panel-settings" : ""}`} role="dialog" aria-modal="true" aria-labelledby="home-panel-title" ref={dialogRef}>
            <div className="home-panel-header">
              <div><p className="home-panel-eyebrow">MAKE IT YOUR MATCH</p><h2 id="home-panel-title">{panel === "settings" ? "Match settings" : "Choose your ground"}</h2></div>
              <button className="home-icon-button" type="button" onClick={() => setPanel("home")} aria-label="Back to home"><X size={21} /></button>
            </div>
            {panel === "settings" ? <Settings /> : <>
              <p className="home-panel-intro">Three grounds. Three different atmospheres. Pick where you play.</p>
              <StadiumPicker />
              <div className="home-panel-footer"><button type="button" className="home-back-link" onClick={() => setPanel("home")}><ArrowLeft size={16} /> Back</button><button type="button" className="home-confirm" onClick={() => setPanel("home")}><Check size={17} /> {stadium.name}</button></div>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
