import React, { useState, useEffect } from "react";
import { motion, useMotionValue, animate, useTransform } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { playKick, playCheer, playGroan } from "../utils/audio";

export default function PenaltySpot() {
  const {
    difficulty,
    isShooting,
    setShooting,
    recordShot,
    players,
    turn,
    gamePhase,
    setNetBulge,
    ballType,
    shootMethod,
  } = useGameStore();
  const currentPlayer = players[turn];

  const scaleValue = useMotionValue(1);
  const colorValue = useTransform(
    scaleValue,
    [1, 1.3, 1.8, 2.5],
    [
      "rgb(34, 197, 94)",
      "rgb(234, 179, 8)",
      "rgb(239, 68, 68)",
      "rgb(239, 68, 68)",
    ]
  );

  const speed =
    difficulty === "easy" ? 0.8 : difficulty === "medium" ? 0.5 : 0.3;
  const [ballAnim, setBallAnim] = useState({ x: 0, y: 0, scale: 1 });
  const [resultMsg, setResultMsg] = useState("");

  const VOICE_THRESHOLD = 25; // Tùy chỉnh độ nhạy âm thanh tại đây (thường từ 30 - 80)

  useEffect(() => {
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let animationFrame: number;
    let stream: MediaStream;

    if (shootMethod === "voice" && !isShooting && gamePhase === "playing") {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((mediaStream) => {
          stream = mediaStream;
          audioContext = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          microphone = audioContext.createMediaStreamSource(stream);
          microphone.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const checkVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;

            if (average > VOICE_THRESHOLD) {
              handleShoot(); // Kích hoạt sút khi âm lượng vượt ngưỡng
            } else {
              animationFrame = requestAnimationFrame(checkVolume);
            }
          };
          checkVolume();
        })
        .catch((err) => console.error("Mic error:", err));
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (audioContext) audioContext.close();
    };
  }, [shootMethod, isShooting, gamePhase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isShooting && gamePhase === "playing") {
        e.preventDefault();
        handleShoot();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (!isShooting && gamePhase === "playing") {
      scaleValue.set(1);
      const controls = animate(scaleValue, 2.5, {
        duration: speed,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "linear",
      });
      return () => controls.stop();
    }
  }, [isShooting, speed, scaleValue, gamePhase]);

  const handleShoot = () => {
    if (isShooting || gamePhase !== "playing") return;
    setShooting(true);
    playKick();

    const hitValue = scaleValue.get();
    const rand = Math.random();
    let result: "goal" | "miss" | "post";

    if (hitValue <= 1.3) {
      result = rand < 0.9 ? "goal" : rand < 0.95 ? "post" : "miss";
    } else if (hitValue <= 1.8) {
      result = rand < 0.6 ? "goal" : rand < 0.8 ? "post" : "miss";
    } else {
      result = rand < 0.2 ? "goal" : rand < 0.5 ? "post" : "miss";
    }

    let endY = -120;
    let endX = 0;

    if (result === "goal") {
      endX = (Math.random() - 0.5) * 200;
      endY = -240;
    } else if (result === "post") {
      endX = Math.random() > 0.5 ? 100 : -100;
      endY = -200;
    } else {
      endX = Math.random() > 0.5 ? 180 : -180;
      endY = -270;
    }

    setBallAnim({ x: endX, y: endY, scale: 0.55 });

    setTimeout(() => {
      if (result === "goal") {
        setResultMsg("⚽ VÀOOOOOO!");
        setNetBulge(true);
        playCheer();
      } else if (result === "post") {
        setResultMsg("💥 CỘT DỌC!");
        playGroan();
        setBallAnim((prev) => ({
          x: prev.x * 1.3,
          y: prev.y + 30,
          scale: 0.65,
        }));
      } else {
        setResultMsg("❌ TRƯỢT!");
        playGroan();
      }

      setTimeout(() => {
        setResultMsg("");
        setNetBulge(false);
        setBallAnim({ x: 0, y: 0, scale: 1 });
        recordShot(result);
      }, 2300);
    }, 450);
  };

  const getBallStyle = () => {
    if (ballType === "classic")
      return {
        background:
          "radial-gradient(circle at 30% 30%, #8b4513 0%, #5c2e0b 100%)",
      };
    if (ballType === "modern")
      return {
        background:
          "radial-gradient(circle at 30% 30%, #39ff14 0%, #008000 100%)",
        boxShadow: "0 0 12px #39ff14",
      };
    return {
      background:
        "radial-gradient(circle at 30% 30%, #ffffff 0%, #d1d5db 60%, #9ca3af 100%)",
    };
  };

  if (gamePhase !== "playing") return null;

  return (
    <div className="absolute top-[280px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-30 pointer-events-none">
      {/* Hiệu ứng Text */}
      {resultMsg && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.5 }}
          animate={{ opacity: 1, y: -60, scale: 1 }}
          className="absolute -top-[100px] text-4xl md:text-5xl font-black text-yellow-300 drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] z-50 whitespace-nowrap"
        >
          {resultMsg}
        </motion.div>
      )}

      {/* Vòng canh nhịp (Timing Ring) */}
      {!isShooting && (
        <motion.div
          style={{
            scale: scaleValue,
            borderColor: colorValue,
            background: colorValue,
          }}
          className="absolute w-[60px] h-[60px] rounded-full border-[2px] opacity-40 z-20"
        />
      )}

      <div className="absolute top-[40px] flex flex-col items-center z-10 pointer-events-none drop-shadow-xl">
        {/* Đầu Lego */}
        <div className="w-5 h-6 bg-[#facc15] rounded-md border-[2px] border-slate-700 shadow-inner z-20" />
        {/* Thân Lego mặc áo */}
        <div
          className={`w-11 h-10 -mt-1 rounded-lg border-[1.5px] border-slate-700 shadow-md flex items-center justify-center bg-${currentPlayer.jerseyColor}`}
        >
          <span className="text-white text-xs font-black drop-shadow-md">
            {currentPlayer.name.slice(0, 4).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Bóng bay đi (Tâm xoay tại 0,0) */}
      <motion.div
        animate={ballAnim}
        transition={{ duration: 0.45, ease: isShooting ? "easeOut" : "linear" }}
        className="w-7 h-7 rounded-full z-40 border border-black/40 shadow-xl"
        style={getBallStyle()}
      >
        {ballType === "standard" && (
          <>
            <div className="w-2.5 h-2.5 bg-slate-900 rounded-full absolute top-1 left-2 opacity-80" />
            <div className="w-2 h-2 bg-slate-900 rounded-full absolute bottom-1 right-2 opacity-80" />
          </>
        )}
      </motion.div>

      {/* UI hướng dẫn sút (Nút bấm hoặc nhận diện Mic) */}
      {shootMethod === "button" ? (
        <button
          onClick={handleShoot}
          disabled={isShooting}
          className="absolute text-nowrap top-[120px] pointer-events-auto px-6 py-2.5 bg-slate-600 text-white font-black text-sm rounded-full hover:bg-slate-500 active:scale-95 disabled:opacity-0 transition-all active:shadow-none"
        >
          SÚT (SPACE)
        </button>
      ) : (
        <div className="absolute top-[80px] px-4 py-2 bg-slate-900/90 border border-green-500/50 text-green-400 font-bold rounded-full text-xs flex flex-col items-center shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
            <span>🎙️ Hét lớn để sút!</span>
          </div>
        </div>
      )}
    </div>
  );
}
