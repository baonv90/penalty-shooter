import { useState, useEffect, useRef, useCallback } from "react";
import type { ShotOutcome } from "../utils/penaltyPhysics";
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

  // Nhịp 1: Chọn hướng sút (0 đến 1)
  const [aimValue, setAimValue] = useState(0.5);
  // Nhịp 2: Vòng canh nhịp chất lượng (1 đến 3)
  const [scaleValue, setScaleValue] = useState(3);

  const [resultMsg, setResultMsg] = useState("");
  const [ballTarget, setBallTarget] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
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
    if (gamePhase !== "playing" || (phase !== "aiming" && phase !== "timing")) return;

    let animId: number;

    let previousTime: number | undefined;
    const loop = (time: number) => {
      const frameScale = previousTime === undefined ? 1 : Math.min((time - previousTime) / (1000 / 60), 3);
      previousTime = time;
      // PHASE 1: Quét mũi tên chọn hướng sút (Góc sút)
      if (phase === "aiming") {
        setAimValue((prev) => {
          let next = prev + 0.025 * frameScale * aimDirRef.current;
          if (next >= 1) {
            next = 1;
            aimDirRef.current = -1;
          }
          if (next <= 0) {
            next = 0;
            aimDirRef.current = 1;
          }
          return next;
        });
      }
      // PHASE 2: Phóng to/thu nhỏ Vòng Canh Nhịp Chất Lượng (Quality Ring)
      else if (phase === "timing") {
        setScaleValue((prev) => {
          let next = prev + ringSpeed * frameScale * scaleDirRef.current;
          if (next >= 3) {
            next = 3;
            scaleDirRef.current = -1;
          }
          if (next <= 1) {
            next = 1;
            scaleDirRef.current = 1;
          }
          return next;
        });
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [phase, gamePhase, ringSpeed]);

  // ---------------------------------------------------------
  // XỬ LÝ HÀNH ĐỘNG NHẤN PHÍM / CLICK (2 NHỊP)
  // ---------------------------------------------------------
  const handleInput = () => {
    if (gamePhase !== "playing" || shotResolved.current) return;

    // NHỊP 1: BẤM LẦN 1 -> CHỐT HƯỚNG SÚT
    if (phase === "aiming") {
      // Chuyển aimValue (0 -> 1) thành tọa độ ngang khung thành X (-3.2m đến +3.2m)
      chosenTargetX.current = -3.3 + aimValue * 6.6;
      setPhase("timing"); // Chuyển sang nhịp 2
    }
    // NHỊP 2: BẤM LẦN 2 -> CHỐT CHẤT LƯỢNG CÚ SÚT & THỰC HIỆN SÚT
    else if (phase === "timing") {
      setPhase("shooting");
      setShooting(true);

      const hitValue = scaleValue;
      const rand = Math.random();
      let shotQuality: "on_target" | "miss" | "post";

      const isLiam = currentPlayer?.name.toLowerCase() === "liam";

      // Đánh giá chất lượng cú sút từ Vòng Nhịp
      if (hitValue <= (isLiam ? 1.8 : 1.3)) {
        // Vùng Xanh: 90% Sút chính xác vào đúng hướng chọn
        shotQuality = rand < 0.9 ? "on_target" : rand < 0.95 ? "post" : "miss";
      } else if (hitValue <= (isLiam ? 2.4 : 1.6)) {
        // Vùng Vàng: 70% Chính xác
        shotQuality = rand < 0.7 ? "on_target" : rand < 0.8 ? "post" : "miss";
      } else {
        // Vùng Đỏ: Chỉ 40% Chính xác, dễ trượt
        shotQuality = rand < 0.3 ? "on_target" : rand < 0.5 ? "post" : "miss";
      }

      // --- DYNAMIC GOALKEEPER TRAIT LOGIC ---
      const gkType = currentGK?.gkType || "human";
      // AI Position Choice
      let selectedGkX: number;
      if (gkType === "bear") {
        selectedGkX = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -2 : 2;
      } else {
        const gkChoices = [-2.8, 0, 2.8];
        selectedGkX = gkChoices[Math.floor(Math.random() * gkChoices.length)];
      }
      setGkTargetX(selectedGkX);

      const targetX = chosenTargetX.current;
      const finalResult = shotQuality === "on_target" ? "goal" : shotQuality;

      // ĐẶT TỌA ĐỘ BAY CỦA BÓNG 3D
      let finalBallTarget: [number, number, number] = [0, 0, 0];
      if (finalResult === "goal") {
        finalBallTarget = [targetX, 1.2 + Math.random() * 0.8, -4.8]; // Bay vào lưới đúng vị trí đã chọn
      } else if (finalResult === "post") {
        finalBallTarget = [targetX > 0 ? 3.65 : -3.65, 1.2, -4.0]; // Trúng cột
      } else {
        // Trượt: Lệch hẳn ra ngoài
        finalBallTarget = [targetX + (targetX >= 0 ? 2 : -2), 3.0, -6.0];
      }

      setBallTarget(finalBallTarget);
    }
  };

  const resultTimer = useRef<ReturnType<typeof setTimeout>>();
  const shotResolved = useRef(false);
  const onShotResolved = useCallback((outcome: ShotOutcome) => {
    if (shotResolved.current) return;
    shotResolved.current = true;
    setPhase("result");
    setResultMsg({ save: "🧤 CẢN PHÁ!", goal: "⚽ VÀOOOOOO!", post: "💥 CỘT DỌC!", miss: "❌ TRƯỢT!" }[outcome]);
    resultTimer.current = setTimeout(() => {
      setResultMsg("");
      setScaleValue(1);
      setAimValue(0.5);
      setPhase("aiming");
      shotResolved.current = false;
      recordShot(outcome === "save" ? "miss" : outcome);
    }, 1000);
  }, [recordShot]);

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
      className="flex flex-col items-center justify-center bg-slate-950 text-white select-none relative overflow-hidden"
      onClick={handleInput}
    >
      {/* Frame Game 3D */}
      <div className="w-[1350px] h-[600px] relative overflow-hidden rounded-2xl shadow-2xl border border-slate-800 bg-slate-900 flex items-center justify-center">
        {/* Truyền gkTargetX để thủ môn thực sự bay người */}
        <Penalty3D
          onShotResolved={onShotResolved}
          phase={phase}
          aimValue={aimValue}
          scaleValue={scaleValue}
          ballTarget={ballTarget}
          jerseyColor={currentPlayer?.jerseyColor || "bg-red-600"}
          players={players}
          gkType={currentGK?.gkType || "human"}
          gkTargetX={gkTargetX}
        />

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
