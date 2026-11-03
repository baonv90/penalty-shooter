import { useState, useEffect, useRef, useCallback } from "react";
import type { ShotOutcome } from "../utils/penaltyPhysics";
import { createShot, chooseKeeperDive } from "../utils/shotSimulation";
import { randomizeShotQuality } from "../utils/shotQuality";
import Penalty3D from "./Penalty3D";
import { useGameStore } from "../store/gameStore";

export default function GameBoard3D() {
  const { difficulty, players, turn, gamePhase, setShooting, recordShot } =
    useGameStore();

  const currentPlayer = players[turn];

  const opponentIndex = (turn + 1) % players.length;
  const currentGK = players[opponentIndex];

  // Các phase: aiming (chọn hướng) -> timing (chọn lực/độ chuẩn) -> shooting -> result
  const [phase, setPhase] = useState<
    "aiming" | "timing" | "shooting" | "result"
  >("aiming");

  // Frame-by-frame controls are read directly by the 3D loop, without React renders.
  const controlsRef = useRef({ aimValue: 0.5, scaleValue: 3 });

  const [introActive, setIntroActive] = useState(true);
  const finishIntro = useCallback(() => setIntroActive(false), []);

  const [resultMsg, setResultMsg] = useState("");
  const [ballTarget, setBallTarget] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [shotSpeed, setShotSpeed] = useState(19);
  const [gkTargetX, setGkTargetX] = useState<number>(0);

  const aimDirRef = useRef<number>(1);
  const scaleDirRef = useRef<number>(1);
  const chosenTargetX = useRef<number>(0); // Tọa độ X người chơi chọn sút

  // Tốc độ vòng canh nhịp chất lượng theo độ khó
  const ringSpeed =
    difficulty === "easy" ? 0.035 : difficulty === "medium" ? 0.05 : 0.075;

  // ---------------------------------------------------------
  // VÒNG LẶP ANIMATION HOẠT ĐỘNG DỰA THEO PHASE
  // ---------------------------------------------------------
  useEffect(() => {
    if (
      introActive ||
      gamePhase !== "playing" ||
      (phase !== "aiming" && phase !== "timing")
    )
      return;

    let animId: number;

    let previousTime: number | undefined;
    const loop = (time: number) => {
      const frameScale =
        previousTime === undefined
          ? 1
          : Math.min((time - previousTime) / (1000 / 60), 3);
      previousTime = time;
      // PHASE 1: Quét mũi tên chọn hướng sút (Góc sút)
      if (phase === "aiming") {
        const prev = controlsRef.current.aimValue;
        let next = prev + 0.025 * frameScale * aimDirRef.current;
        if (next >= 1) {
          next = 1;
          aimDirRef.current = -1;
        }
        if (next <= 0) {
          next = 0;
          aimDirRef.current = 1;
        }
        controlsRef.current.aimValue = next;
      }
      // PHASE 2: Phóng to/thu nhỏ Vòng Canh Nhịp Chất Lượng (Quality Ring)
      else if (phase === "timing") {
        const prev = controlsRef.current.scaleValue;
        let next = prev + ringSpeed * frameScale * scaleDirRef.current;
        if (next >= 3) {
          next = 3;
          scaleDirRef.current = -1;
        }
        if (next <= 1) {
          next = 1;
          scaleDirRef.current = 1;
        }
        controlsRef.current.scaleValue = next;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [phase, gamePhase, ringSpeed, introActive]);

  // ---------------------------------------------------------
  // XỬ LÝ HÀNH ĐỘNG NHẤN PHÍM / CLICK (2 NHỊP)
  // ---------------------------------------------------------
  const handleInput = () => {
    if (introActive || gamePhase !== "playing" || shotResolved.current) return;

    // NHỊP 1: BẤM LẦN 1 -> CHỐT HƯỚNG SÚT
    if (phase === "aiming") {
      // Chuyển aimValue (0 -> 1) thành tọa độ ngang khung thành X (-3.4m đến +3.4m)
      chosenTargetX.current = -3.4 + controlsRef.current.aimValue * 6.8;
      const quality = randomizeShotQuality();
      controlsRef.current.scaleValue = quality.scaleValue;
      scaleDirRef.current = quality.direction;
      setPhase("timing"); // Chuyển sang nhịp 2
    }
    // NHỊP 2: BẤM LẦN 2 -> CHỐT CHẤT LƯỢNG CÚ SÚT & THỰC HIỆN SÚT
    else if (phase === "timing") {
      setPhase("shooting");
      setShooting(true);

      const shot = createShot(
        chosenTargetX.current,
        controlsRef.current.scaleValue,
      );
      setBallTarget(shot.target);
      setShotSpeed(shot.speed);
      setGkTargetX(
        chooseKeeperDive(
          shot.target[0],
          difficulty,
          currentGK?.gkType ?? "human",
        ),
      );
    }
  };

  const resultTimer = useRef<ReturnType<typeof setTimeout>>();
  const shotResolved = useRef(false);
  const onShotResolved = useCallback(
    (outcome: ShotOutcome) => {
      if (shotResolved.current) return;
      shotResolved.current = true;
      setPhase("result");
      setResultMsg(
        {
          save: "🧤 CẢN PHÁ!",
          goal: "⚽ VÀOOOOOO!",
          post: "💥 CỘT DỌC!",
          miss: "❌ TRƯỢT!",
        }[outcome],
      );
      resultTimer.current = setTimeout(() => {
        setResultMsg("");
        const quality = randomizeShotQuality();
        controlsRef.current.scaleValue = quality.scaleValue;
        scaleDirRef.current = quality.direction;
        controlsRef.current.aimValue = 0.5;
        setPhase("aiming");
        shotResolved.current = false;
        recordShot(outcome === "save" ? "miss" : outcome);
      }, 1700);
    },
    [recordShot],
  );

  useEffect(() => () => clearTimeout(resultTimer.current), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) handleInput();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div
      className="w-full h-full min-h-0 flex flex-col items-center justify-center bg-slate-950 text-white select-none relative overflow-hidden"
      onClick={handleInput}
    >
      {/* Frame Game 3D */}
      <div className="w-full max-w-[1350px] h-full min-h-0 relative overflow-hidden rounded-2xl shadow-2xl border border-slate-800 bg-slate-900 flex items-center justify-center">
        {/* Truyền gkTargetX để thủ môn thực sự bay người */}
        <Penalty3D
          introActive={introActive}
          onIntroComplete={finishIntro}
          onShotResolved={onShotResolved}
          phase={phase}
          controlsRef={controlsRef}
          aimValue={controlsRef.current.aimValue}
          scaleValue={controlsRef.current.scaleValue}
          difficulty={difficulty}
          shotSpeed={shotSpeed}
          ballTarget={ballTarget}
          jerseyColor={currentPlayer?.jerseyColor || "bg-red-600"}
          players={players}
          gkType={currentGK?.gkType || "human"}
          gkTargetX={gkTargetX}
        />

        {introActive && (
          <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-slate-950/35 via-transparent to-slate-950/60">
            <div className="absolute top-6 left-6 text-white">
              <p className="text-xs tracking-[0.3em] uppercase text-green-300">
                Match day
              </p>
              <h2 className="text-2xl sm:text-4xl font-black mt-1">
                PENALTY ARENA
              </h2>
              <p className="text-sm text-slate-200 mt-2">
                {players[0]?.name} vs {players[1]?.name}
              </p>
            </div>
            <button
              type="button"
              className="absolute bottom-20 sm:bottom-6 left-6 pointer-events-auto rounded-full border border-white/30 bg-slate-950/60 px-5 py-2.5 text-sm font-bold hover:bg-slate-800"
              onClick={(event) => {
                event.stopPropagation();
                finishIntro();
              }}
            >
              Bỏ qua giới thiệu →
            </button>
          </div>
        )}

        {/* Thông báo kết quả sút */}
        {resultMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
            <h2 className="text-7xl font-black tracking-widest italic uppercase drop-shadow-[0_10px_30px_#000]">
              {resultMsg}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}
