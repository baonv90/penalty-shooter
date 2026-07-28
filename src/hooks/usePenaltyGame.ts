import { useState, useEffect, useRef, useCallback } from "react";

export type GamePhase = "aiming" | "power" | "shooting" | "result";

export function usePenaltyGame() {
  const [phase, setPhase] = useState<GamePhase>("aiming");
  const [aimValue, setAimValue] = useState(0.5); // 0 (Trái) -> 1 (Phải)
  const [powerValue, setPowerValue] = useState(0); // 0 -> 1 (0.5 là hoàn hảo)
  const [lastResult, setLastResult] = useState<
    "VÀOOO!" | "CẢN PHÁ!" | "RA NGOÀI!" | null
  >(null);
  const [score, setScore] = useState({ goals: 0, saves: 0 });

  const [ballTarget, setBallTarget] = useState<[number, number, number]>([
    0, 0, 0,
  ]);

  const requestRef = useRef<number>();
  const aimDir = useRef<number>(1);
  const powerDir = useRef<number>(1);

  // Ánh xạ aimValue (0->1) thành quỹ đạo chữ U
  // 0: Góc trên trái -> 0.25: Dưới trái -> 0.5: Giữa thấp -> 0.75: Dưới phải -> 1: Góc trên phải
  const getTargetCoords = (aim: number): [number, number, number] => {
    const targetX = -3.5 + aim * 7.0; // Từ -3.5 đến 3.5
    const normalizedAim = aim * 2 - 1; // -1 đến 1
    // Công thức Parabol
    const targetY = 2.4 - (1 - normalizedAim * normalizedAim) * 2.0;
    return [targetX, targetY, -4.8];
  };

  const updateLoop = useCallback(() => {
    if (phase === "aiming") {
      setAimValue((prev) => {
        let next = prev + 0.015 * aimDir.current;
        if (next >= 1) {
          next = 1;
          aimDir.current = -1;
        }
        if (next <= 0) {
          next = 0;
          aimDir.current = 1;
        }
        return next;
      });
    } else if (phase === "power") {
      setPowerValue((prev) => {
        let next = prev + 0.025 * powerDir.current;
        if (next >= 1) {
          next = 1;
          powerDir.current = -1;
        }
        if (next <= 0) {
          next = 0;
          powerDir.current = 1;
        }
        return next;
      });
    }
    requestRef.current = requestAnimationFrame(updateLoop);
  }, [phase]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [updateLoop]);

  const handleInput = useCallback(() => {
    if (phase === "aiming") {
      setPhase("power");
    } else if (phase === "power") {
      setPhase("shooting");

      const baseCoords = getTargetCoords(aimValue);
      // Lực càng xa 0.5 thì độ lệch càng cao
      const errorMargin = Math.abs(powerValue - 0.5) * 2;
      const isMiss = errorMargin > 0.65; // Quá tệ -> Sút bay ra ngoài

      const finalTarget: [number, number, number] = [
        baseCoords[0] + (Math.random() - 0.5) * errorMargin * 3,
        baseCoords[1] + (Math.random() - 0.5) * errorMargin * 2.5,
        baseCoords[2],
      ];

      // AI Thủ môn
      const gkChoices = [-3.2, 0, 3.2];
      const gkX = gkChoices[Math.floor(Math.random() * gkChoices.length)];

      setBallTarget(finalTarget);

      setTimeout(() => {
        if (
          isMiss ||
          finalTarget[0] < -3.7 ||
          finalTarget[0] > 3.7 ||
          finalTarget[1] > 2.5
        ) {
          setLastResult("RA NGOÀI!");
        } else if (Math.abs(gkX - finalTarget[0]) < 1.2) {
          setScore((s) => ({ ...s, saves: s.saves + 1 }));
          setLastResult("CẢN PHÁ!");
        } else {
          setScore((s) => ({ ...s, goals: s.goals + 1 }));
          setLastResult("VÀOOO!");
        }
        setPhase("result");
      }, 1600);
    } else if (phase === "result") {
      setPhase("aiming");
      setAimValue(0.5);
      setPowerValue(0);
      setLastResult(null);
    }
  }, [phase, aimValue, powerValue]);

  return {
    phase,
    aimValue,
    powerValue,
    ballTarget,
    lastResult,
    score,
    handleInput,
  };
}
