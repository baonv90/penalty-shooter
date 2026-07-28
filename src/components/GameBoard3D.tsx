import { useState, useEffect, useRef } from "react";
import Penalty3D from "./Penalty3D";
import { useGameStore } from "../store/gameStore";

export default function GameBoard3D() {
  const { difficulty, players, turn, gamePhase, setShooting, recordShot } =
    useGameStore();

  const currentPlayer = players[turn];

  // Các phase: aiming (chọn hướng) -> timing (chọn lực/độ chuẩn) -> shooting -> result
  const [phase, setPhase] = useState<
    "aiming" | "timing" | "shooting" | "result"
  >("aiming");

  // Nhịp 1: Chọn hướng sút (0 đến 1)
  const [aimValue, setAimValue] = useState(0.5);
  // Nhịp 2: Vòng canh nhịp chất lượng (1 đến 3)
  const [scaleValue, setScaleValue] = useState(1);

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
    if (gamePhase !== "playing") return;

    let animId: number;

    const loop = () => {
      // PHASE 1: Quét mũi tên chọn hướng sút (Góc sút)
      if (phase === "aiming") {
        setAimValue((prev) => {
          let next = prev + 0.015 * aimDirRef.current;
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
          let next = prev + ringSpeed * scaleDirRef.current;
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
    if (gamePhase !== "playing") return;

    // NHỊP 1: BẤM LẦN 1 -> CHỐT HƯỚNG SÚT
    if (phase === "aiming") {
      // Chuyển aimValue (0 -> 1) thành tọa độ ngang khung thành X (-3.2m đến +3.2m)
      chosenTargetX.current = -3.2 + aimValue * 6.4;
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
      if (hitValue <= (isLiam ? 2.0 : 1.3)) {
        // Vùng Xanh: 95% Sút chính xác vào đúng hướng chọn
        shotQuality = rand < 0.95 ? "on_target" : rand < 0.98 ? "post" : "miss";
      } else if (hitValue <= (isLiam ? 2.4 : 1.6)) {
        // Vùng Vàng: 80% Chính xác
        shotQuality = rand < 0.8 ? "on_target" : rand < 0.9 ? "post" : "miss";
      } else {
        // Vùng Đỏ: Chỉ 40% Chính xác, dễ trượt
        shotQuality = rand < 0.4 ? "on_target" : rand < 0.7 ? "post" : "miss";
      }

      // THỦ MÔN PHÁN ĐOÁN HƯỚNG (Trái: -2.8, Giữa: 0, Phải: 2.8)
      const gkChoices = [-2.8, 0, 2.8];
      const selectedGkX =
        gkChoices[Math.floor(Math.random() * gkChoices.length)];
      setGkTargetX(selectedGkX);

      // XÁC ĐỊNH KẾT QUẢ KHI SÚT VÀO HƯỚNG ĐÃ CHỌN
      const targetX = chosenTargetX.current;
      let finalResult: "goal" | "miss" | "post" | "save" = shotQuality as any;

      if (shotQuality === "on_target") {
        // Kiểm tra xem Thủ môn có cản phá được không
        const isGkNear = Math.abs(selectedGkX - targetX) < 1.3;
        const gkSaveProbability =
          difficulty === "easy" ? 0.3 : difficulty === "medium" ? 0.5 : 0.7;

        if (isGkNear && Math.random() < gkSaveProbability) {
          finalResult = "save"; // Thủ môn đẩy bóng
        } else {
          finalResult = "goal"; // Vào lưới!
        }
      }

      // ĐẶT TỌA ĐỘ BAY CỦA BÓNG 3D
      let finalBallTarget: [number, number, number] = [0, 0, 0];
      if (finalResult === "save") {
        finalBallTarget = [selectedGkX, 1.2, -3.9]; // Bay thẳng vào tay/thân thủ môn
      } else if (finalResult === "goal") {
        finalBallTarget = [targetX, 1.2 + Math.random() * 0.8, -4.8]; // Bay vào lưới đúng vị trí đã chọn
      } else if (finalResult === "post") {
        finalBallTarget = [targetX > 0 ? 3.65 : -3.65, 1.2, -4.0]; // Trúng cột
      } else {
        // Trượt: Lệch hẳn ra ngoài
        finalBallTarget = [targetX + (targetX >= 0 ? 2 : -2), 3.0, -6.0];
      }

      setBallTarget(finalBallTarget);

      // ĐỢI ANIMATION 3D HOÀN TẤT VÀ HIỆN KẾT QUẢ
      setTimeout(() => {
        setPhase("result");
        if (finalResult === "save") setResultMsg("🧤 CẢN PHÁ!");
        else if (finalResult === "goal") setResultMsg("⚽ VÀOOOOOO!");
        else if (finalResult === "post") setResultMsg("💥 CỘT DỌC!");
        else setResultMsg("❌ TRƯỢT!");

        // Chờ thêm 1.5 giây để chuyển sang lượt tiếp theo
        setTimeout(() => {
          setResultMsg("");
          setScaleValue(1);
          setAimValue(0.5);
          setPhase("aiming");
          recordShot(finalResult === "save" ? "miss" : finalResult);
        }, 1000);
      }, 600);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") handleInput();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // const getRingColor = () => {
  //   if (scaleValue <= 1.3) return "rgb(34, 197, 94)"; // Green
  //   if (scaleValue <= 1.8) return "rgb(234, 179, 8)"; // Yellow
  //   return "rgb(239, 68, 68)"; // Red
  // };

  return (
    <div
      className="flex flex-col items-center justify-center bg-slate-950 text-white select-none relative overflow-hidden"
      onClick={handleInput}
    >
      {/* Frame Game 3D */}
      <div className="w-[1200px] h-[600px] relative overflow-hidden rounded-2xl shadow-2xl border border-slate-800 bg-slate-900 flex items-center justify-center">
        {/* Truyền gkTargetX để thủ môn thực sự bay người */}
        <Penalty3D
          phase={phase}
          aimValue={aimValue}
          scaleValue={scaleValue}
          ballTarget={ballTarget}
          jerseyColor={currentPlayer?.jerseyColor || "bg-red-600"}
          gkTargetX={gkTargetX}
        />

        {/* OVERLAY: Vòng canh nhịp xuất hiện ở Nhịp 2 (Phase Timing) */}
        {/* {phase === "timing" && gamePhase === "playing" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-4 h-4 bg-white rounded-full opacity-80" />
            <div
              className="absolute rounded-full border-[3px]"
              style={{
                width: 40 * scaleValue,
                height: 40 * scaleValue,
                borderColor: getRingColor(),
                backgroundColor: getRingColor()
                  .replace("rgb", "rgba")
                  .replace(")", ", 0.2)"),
              }}
            />
          </div>
        )} */}

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
